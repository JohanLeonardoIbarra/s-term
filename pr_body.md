## Problem
SSH remote terminal sessions were closing randomly when typing fast or after periods of inactivity. This made the application unusable for remote connections.

## Root Cause
The SSH implementation used non-blocking mode with error counting heuristics. The crate `ssh2` does not properly map libssh2's EAGAIN errors ("Failure while draining incoming flow" and "transport read") to Rust's `WouldBlock` error kind. Instead, they arrive as `Custom { kind: Other }` errors, which were counted as fatal and caused the session to close after 64 consecutive errors.

This was NOT a buffer overflow issue - logs showed the buffer was nearly empty (10 bytes) when errors occurred.

## Solution
Rewrote the SSH session handling to use **blocking mode** with **timeout** and **keepalive**:

### Key Changes
1. **Blocking mode** (`sess.set_blocking(true)`): libssh2 drains incoming flow internally, eliminating EAGAIN-as-error failures
2. **Session timeout** (`sess.set_timeout(50)`): Read calls block at most 50ms before returning a timeout treated as "no data yet"
3. **Keepalive** (`sess.set_keepalive(true, 15)`): Sends keepalive every 15 seconds to detect genuinely dead connections
4. **Reordered event loop**: Drain ALL pending reads BEFORE processing writes (prevents "Failure while draining incoming flow" on writes)
5. **Removed error counting**: Eliminated heuristics that caused false positives
6. **Keepalive as only detector**: `keepalive_send()` is now the sole reliable dead-connection detector

### Why This Cannot Fail the Same Way
- In blocking mode, libssh2 handles EAGAIN internally - the errors that caused closures no longer occur
- Timeouts are treated as "no data yet" (normal), not as errors
- Only genuine connection death (EOF or keepalive failure) closes the session
- No error counting means no false positives from transient issues

## Testing
- Verified SSH sessions remain stable during fast typing
- Sessions stay open during idle periods
- Only close on genuine disconnect or user-initiated close

## Files Changed
- `src-tauri/src/ssh.rs`: Complete rewrite of SSH event loop
