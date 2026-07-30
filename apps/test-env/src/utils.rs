use std::{collections::HashMap, ops::Add, sync::mpsc};

use mlua::{Error, FromLua, IntoLua, Lua, Result as LuaResult, Table, Value};
use ureq::http::StatusCode;

use crate::{
    content_reader::ReadHandleContent,
    world::{ENDERCHEST_ID, Position},
};

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Heading {
    North = 0,
    East,
    South,
    West,
}
impl Add<Position> for Heading {
    type Output = Position;
    fn add(self, (x, y, z): Position) -> Self::Output {
        let (dx, dz) = self.delta();
        (x + dx, y, z + dz)
    }
}

impl Heading {
    pub fn delta(self) -> (isize, isize) {
        match self {
            Heading::North => (0, -1),
            Heading::South => (0, 1),
            Heading::East => (1, 0),
            Heading::West => (-1, 0),
        }
    }
    pub fn turn_left(self) -> Self {
        match self {
            Self::North => Self::West,
            Self::East => Self::North,
            Self::South => Self::East,
            Self::West => Self::South,
        }
    }
    pub fn turn_right(self) -> Self {
        match self {
            Self::North => Self::East,
            Self::East => Self::South,
            Self::South => Self::West,
            Self::West => Self::North,
        }
    }
    pub fn opposite(self) -> Self {
        match self {
            Self::North => Self::South,
            Self::East => Self::West,
            Self::South => Self::North,
            Self::West => Self::East,
        }
    }
    pub fn string(self) -> String {
        match self {
            Self::North => "north",
            Self::East => "east",
            Self::South => "south",
            Self::West => "west",
        }
        .to_string()
    }
}

#[derive(Debug, Clone)]
pub struct ItemStack {
    pub name: String,
    pub count: u8,
    pub nbt: Option<String>, // TODO: replace that by a true tree-like structure
}
impl IntoLua for ItemStack {
    fn into_lua(self, lua: &Lua) -> LuaResult<Value> {
        let table = lua.create_table()?;
        table.set("name", self.name)?;
        table.set("count", self.count)?;
        table.set("maxCount", 64)?;
        table.set("nbt", self.nbt)?;
        Ok(Value::Table(table))
    }
}
impl ItemStack {
    pub fn new(name: impl Into<String>, count: u8) -> Self {
        Self {
            name: name.into(),
            count,
            nbt: None,
        }
    }
    pub fn new_with_nbt(name: impl Into<String>, count: u8, nbt: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            count,
            nbt: Some(nbt.into()),
        }
    }

    /// Clone the item stack with count set to 1
    pub fn to_block(&self) -> BlockType {
        let mut itemstack = self.clone();
        itemstack.count = 1;
        if itemstack.name == ENDERCHEST_ID {
            BlockType::Inventory(itemstack)
        } else {
            BlockType::Block(itemstack)
        }
    }

    pub fn is_enderchest(&self) -> bool {
        return self.name == ENDERCHEST_ID;
    }
}

#[derive(Debug, Clone)]
pub enum BlockType {
    Block(ItemStack),
    Inventory(ItemStack),
}
impl BlockType {
    pub fn get_item(&self) -> ItemStack {
        match self {
            Self::Block(i) => i,
            Self::Inventory(i) => i,
        }
        .clone()
    }
}

#[derive(Debug, Clone)]
pub enum EventArg {
    Nil,
    Bool(bool),
    Int(i64),
    Num(f64),
    Str(String),
    Table(Table),
}
impl IntoLua for EventArg {
    fn into_lua(self, lua: &Lua) -> LuaResult<Value> {
        match self {
            EventArg::Nil => Ok(Value::Nil),
            EventArg::Bool(b) => Ok(Value::Boolean(b)),
            EventArg::Int(i) => Ok(Value::Integer(i)),
            EventArg::Num(n) => Ok(Value::Number(n)),
            EventArg::Str(s) => Ok(Value::String(lua.create_string(s)?)),
            EventArg::Table(table) => Ok(Value::Table(table)),
        }
    }
}
impl FromLua for EventArg {
    fn from_lua(value: Value, _: &Lua) -> LuaResult<Self> {
        match value {
            Value::Nil => Ok(Self::Nil),
            Value::Boolean(b) => Ok(Self::Bool(b)),
            Value::Integer(i) => Ok(Self::Int(i)),
            Value::Number(n) => Ok(Self::Num(n)),
            Value::String(s) => Ok(Self::Str(s.to_string_lossy())),
            Value::Table(table) => Ok(Self::Table(table)),
            _ => Err(Error::FromLuaConversionError {
                from: value.type_name(),
                to: "EventArg".to_string(),
                message: None,
            }),
        }
    }
}

pub struct HTTPRequest {
    pub url: String,
    pub receiver: mpsc::Receiver<Result<HTTPResponse, String>>,
}
pub struct HTTPResponse {
    pub code: StatusCode,
    pub body: ReadHandleContent,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub enum HTTPMethod {
    GET,
    POST,
    HEAD,
    OPTIONS,
    PUT,
    DELETE,
    PATCH,
    TRACE,
}

impl HTTPMethod {
    pub fn has_body(&self) -> bool {
        match self {
            HTTPMethod::POST | HTTPMethod::PUT | HTTPMethod::PATCH => true,
            HTTPMethod::GET
            | HTTPMethod::HEAD
            | HTTPMethod::DELETE
            | HTTPMethod::OPTIONS
            | HTTPMethod::TRACE => false,
        }
    }

    pub fn from_string(method: String) -> Result<Self, String> {
        match method.to_uppercase().as_str() {
            "GET" => Ok(HTTPMethod::GET),
            "POST" => Ok(HTTPMethod::POST),
            "HEAD" => Ok(HTTPMethod::HEAD),
            "OPTIONS" => Ok(HTTPMethod::OPTIONS),
            "PUT" => Ok(HTTPMethod::PUT),
            "DELETE" => Ok(HTTPMethod::DELETE),
            "PATCH" => Ok(HTTPMethod::PATCH),
            "TRACE" => Ok(HTTPMethod::TRACE),
            other => {
                return Err(format!("unsupported HTTP method: {other}"));
            }
        }
    }
}
