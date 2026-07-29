use std::{cell::RefCell, matches, rc::Rc};

use mlua::{Lua, MultiValue, Result as LuaResult, Table, Value};

pub enum ReadHandleContent {
    Text(String),
    Binary(Vec<u8>),
}

impl ReadHandleContent {
    fn as_bytes(&self) -> &[u8] {
        match self {
            ReadHandleContent::Text(s) => s.as_bytes(),
            ReadHandleContent::Binary(b) => b,
        }
    }

    fn is_binary(&self) -> bool {
        matches!(self, ReadHandleContent::Binary(_))
    }
}

impl From<String> for ReadHandleContent {
    fn from(s: String) -> Self {
        ReadHandleContent::Text(s)
    }
}
impl From<Vec<u8>> for ReadHandleContent {
    fn from(b: Vec<u8>) -> Self {
        ReadHandleContent::Binary(b)
    }
}

pub fn make_read_handle(lua: &Lua, content: impl Into<ReadHandleContent>) -> LuaResult<Table> {
    let content = content.into();
    let binary = content.is_binary();
    let bytes: Rc<Vec<u8>> = Rc::new(content.as_bytes().to_vec());
    let cursor = Rc::new(RefCell::new(0usize));

    let handle = lua.create_table()?;

    handle.set(
        "readAll",
        lua.create_function({
            let bytes = bytes.clone();
            let cursor = cursor.clone();
            move |lua, ()| {
                let mut i = cursor.borrow_mut();
                if *i >= bytes.len() {
                    return Ok(Value::Nil);
                }
                let rest = &bytes[*i..];
                *i = bytes.len();
                if binary {
                    Ok(Value::String(lua.create_string(rest)?))
                } else {
                    Ok(Value::String(lua.create_string(rest)?)) // still valid UTF-8, same as CC's text readAll
                }
            }
        })?,
    )?;

    handle.set(
        "readLine",
        lua.create_function({
            let bytes = bytes.clone();
            let cursor = cursor.clone();
            move |lua, ()| {
                let mut i = cursor.borrow_mut();
                if *i >= bytes.len() {
                    return Ok(Value::Nil);
                }
                let start = *i;
                let end = bytes[start..]
                    .iter()
                    .position(|&b| b == b'\n')
                    .map(|p| start + p)
                    .unwrap_or(bytes.len());
                let line = &bytes[start..end];
                *i = if end < bytes.len() { end + 1 } else { end };
                Ok(Value::String(lua.create_string(line)?))
            }
        })?,
    )?;

    handle.set(
        "read",
        lua.create_function({
            let bytes = bytes.clone();
            let cursor = cursor.clone();
            move |lua, count: Option<usize>| {
                let mut i = cursor.borrow_mut();
                if *i >= bytes.len() {
                    return Ok(Value::Nil);
                }

                if binary && count.is_none() {
                    let byte = bytes[*i];
                    *i += 1;
                    return Ok(Value::Integer(byte as i64));
                }

                let n = count.unwrap_or(1).min(bytes.len() - *i);
                let chunk = &bytes[*i..*i + n];
                *i += n;
                Ok(Value::String(lua.create_string(chunk)?))
            }
        })?,
    )?;

    handle.set(
        "seek",
        lua.create_function({
            let bytes = bytes.clone();
            let cursor = cursor.clone();
            move |lua, (whence, offset): (Option<String>, Option<i64>)| {
                let whence = whence.as_deref().unwrap_or("cur");
                let offset = offset.unwrap_or(0);

                let base: i64 = match whence {
                    "set" => 0,
                    "cur" => *cursor.borrow() as i64,
                    "end" => bytes.len() as i64,
                    other => {
                        let msg = lua.create_string(&format!(
                            "bad argument #1 to 'seek' (invalid option '{other}')"
                        ))?;
                        return Ok(MultiValue::from_vec(vec![Value::Nil, Value::String(msg)]));
                    }
                };

                let new_pos = base + offset;
                if new_pos < 0 || new_pos as usize > bytes.len() {
                    let msg = lua.create_string("Position is out of bounds")?;
                    return Ok(MultiValue::from_vec(vec![Value::Nil, Value::String(msg)]));
                }

                *cursor.borrow_mut() = new_pos as usize;
                Ok(MultiValue::from_vec(vec![
                    Value::Integer(new_pos),
                    Value::Nil,
                ]))
            }
        })?,
    )?;

    handle.set("close", lua.create_function(|_, ()| Ok(()))?)?;

    Ok(handle)
}
