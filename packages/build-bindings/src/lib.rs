use flate2::write::ZlibEncoder;
use flate2::Compression;
use std::io::Write;

use wasm_bindgen::prelude::*;

fn compress(input: &[u8], level: Option<u32>) -> Vec<u8> {
    let level = level.unwrap_or(6);
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::new(level));
    encoder.write_all(input).unwrap();
    let compressed = encoder.finish().unwrap();
    compressed
}
fn decompress(input: &[u8]) -> Vec<u8> {
    let mut decoder = flate2::write::ZlibDecoder::new(Vec::new());
    decoder.write_all(input).unwrap();
    decoder.finish().unwrap()
}

#[wasm_bindgen]
pub fn compress_buffer(data: &[u8], level: u32) -> Result<Vec<u8>, JsError> {
    let compressed = compress(data, Some(level));
    Ok(compressed)
}

#[wasm_bindgen]
pub fn decompress_buffer(data: &[u8]) -> Result<Vec<u8>, JsError> {
    let decompressed = decompress(data);
    Ok(decompressed)
}
