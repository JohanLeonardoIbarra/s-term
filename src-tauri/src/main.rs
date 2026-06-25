// Prevents an additional console window on Windows in release, DO NOT REMOVE!!

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    s_term_lib::run()
}
