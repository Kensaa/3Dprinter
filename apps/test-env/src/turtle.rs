use crate::world::{Position, World};
use mlua::{Error, FromLua, IntoLua, Lua, Result as LuaResult, Value};
use std::{
    collections::{HashMap, VecDeque},
    net::TcpStream,
};
use tungstenite::{WebSocket, stream::MaybeTlsStream};

const INVENTORY_SIZE: usize = 16;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Heading {
    North = 0,
    East,
    South,
    West,
}
impl Heading {
    fn delta(self) -> (isize, isize) {
        match self {
            Heading::North => (0, -1),
            Heading::South => (0, 1),
            Heading::East => (1, 0),
            Heading::West => (-1, 0),
        }
    }
    fn turn_left(self) -> Self {
        match self {
            Self::North => Self::West,
            Self::East => Self::North,
            Self::South => Self::East,
            Self::West => Self::South,
        }
    }
    fn turn_right(self) -> Self {
        match self {
            Self::North => Self::East,
            Self::East => Self::South,
            Self::South => Self::West,
            Self::West => Self::North,
        }
    }
    fn opposite(self) -> Self {
        match self {
            Self::North => Self::South,
            Self::East => Self::West,
            Self::South => Self::North,
            Self::West => Self::East,
        }
    }
}

// type Slot = (String, u8);
#[derive(Debug, Clone)]
pub struct Slot {
    pub name: String,
    pub count: u8,
}
impl IntoLua for Slot {
    fn into_lua(self, lua: &Lua) -> LuaResult<Value> {
        let table = lua.create_table()?;
        table.set("name", self.name)?;
        table.set("count", self.count)?;
        table.set("maxCount", 64)?;
        Ok(Value::Table(table))
    }
}
impl Slot {
    pub fn new(name: impl Into<String>, count: u8) -> Self {
        Self {
            name: name.into(),
            count,
        }
    }
}

#[derive(Debug, Clone)]
pub enum EventArg {
    Nil,
    Bool(bool),
    Int(i64),
    Num(f64),
    Str(String),
}
impl IntoLua for EventArg {
    fn into_lua(self, lua: &Lua) -> LuaResult<Value> {
        match self {
            EventArg::Nil => Ok(Value::Nil),
            EventArg::Bool(b) => Ok(Value::Boolean(b)),
            EventArg::Int(i) => Ok(Value::Integer(i)),
            EventArg::Num(n) => Ok(Value::Number(n)),
            EventArg::Str(s) => Ok(Value::String(lua.create_string(s)?)),
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
            _ => Err(Error::FromLuaConversionError {
                from: value.type_name(),
                to: "EventArg".to_string(),
                message: None,
            }),
        }
    }
}

pub struct TurtleState {
    pub id: usize,
    pub label: Option<String>,
    pub position: Position,
    pub heading: Heading,
    pub inventory: [Option<Slot>; INVENTORY_SIZE],
    pub selected_slot: usize,
    pub equipment: [Option<Slot>; 2],

    pub event_queue: VecDeque<Vec<EventArg>>,

    pub websockets: HashMap<usize, WebSocket<MaybeTlsStream<TcpStream>>>,
    next_websocket_id: usize,
}

impl TurtleState {
    pub fn new(
        id: usize,
        label: Option<impl Into<String>>,
        position: Position,
        heading: Heading,
    ) -> Self {
        Self {
            id,
            label: label.map(|s| s.into()),
            position,
            heading,
            inventory: Default::default(),
            selected_slot: 1,
            equipment: Default::default(),

            event_queue: VecDeque::new(),

            websockets: HashMap::new(),
            next_websocket_id: 0,
        }
    }

    fn front_pos(&self) -> Position {
        let (dx, dz) = self.heading.delta();
        let (x, y, z) = self.position;
        (x + dx, y, z + dz)
    }

    fn back_pos(&self) -> Position {
        let (dx, dz) = self.heading.opposite().delta();
        let (x, y, z) = self.position;
        (x + dx, y, z + dz)
    }

    fn up_pos(&self) -> Position {
        let (x, y, z) = self.position;
        (x, y + 1, z)
    }

    fn down_pos(&self) -> Position {
        let (x, y, z) = self.position;
        (x, y - 1, z)
    }

    fn move_to(&mut self, world: &mut World, position: Position) -> bool {
        if !world.is_air(position) {
            return false;
        }
        world.move_turtle(self, position);
        true
    }

    pub fn forward(&mut self, world: &mut World) -> bool {
        self.move_to(world, self.front_pos())
    }

    pub fn backward(&mut self, world: &mut World) -> bool {
        self.move_to(world, self.back_pos())
    }

    pub fn up(&mut self, world: &mut World) -> bool {
        self.move_to(world, self.up_pos())
    }

    pub fn down(&mut self, world: &mut World) -> bool {
        self.move_to(world, self.down_pos())
    }

    pub fn turn_left(&mut self, world: &mut World) -> bool {
        world.turn_turtle(self, self.heading.turn_left());
        true
    }

    pub fn turn_right(&mut self, world: &mut World) -> bool {
        world.turn_turtle(self, self.heading.turn_right());
        true
    }

    pub fn select(&mut self, slot: usize) -> bool {
        if slot < 1 || slot > 16 {
            return false;
        }

        self.selected_slot = slot;
        true
    }

    pub fn get_selected_slot(&self) -> usize {
        self.selected_slot
    }

    pub fn get_item_detail(&self, slot: Option<usize>) -> Option<Slot> {
        let slot = slot.unwrap_or(self.selected_slot);
        self.inventory[slot - 1].clone()
    }

    fn equip(&mut self, eq_slot: usize) -> bool {
        let eq_slot = &mut self.equipment[eq_slot];
        let inv_slot = &mut self.inventory[self.selected_slot - 1];

        // TODO: make equip only move 1 items if there is more than 1 in the slot
        // TODO: filter which item can be equipped

        let eq = eq_slot.take();
        let inv = inv_slot.take();
        *inv_slot = eq;
        *eq_slot = inv;
        true
    }

    pub fn equip_left(&mut self) -> bool {
        self.equip(0)
    }

    pub fn equip_right(&mut self) -> bool {
        self.equip(1)
    }

    pub fn get_equipped_left(&mut self) -> Option<Slot> {
        return self.equipment[0].clone();
    }

    pub fn get_equipped_right(&mut self) -> Option<Slot> {
        return self.equipment[1].clone();
    }

    fn place_at(&mut self, world: &mut World, pos: Position) -> bool {
        if !world.is_air(pos) {
            return false;
        }
        let slot = &mut self.inventory[self.selected_slot - 1];

        let item = match slot {
            None => {
                return false;
            }
            Some(slot) => slot,
        };
        world.set(pos, item.name.clone());
        item.count -= 1;
        if item.count == 0 {
            *slot = None;
        }

        true
    }

    fn dig_at(&mut self, world: &mut World, pos: Position) -> bool {
        if world.is_air(pos) {
            return false;
        }

        let item = match world.remove(pos) {
            Some(item) => item,
            None => return false, // TODO: this means that the current turtle tried to dig another turtle, implement better error handling here
        };

        let first_match = self.inventory[self.selected_slot - 1..]
            .iter_mut()
            .find_map(|slot| {
                if let Some(content) = slot {
                    if content.name == item && content.count < 64 {
                        return Some(slot);
                    } else {
                        return None;
                    }
                } else {
                    return Some(slot);
                }
            });

        match first_match {
            None => {} // Inventory is full,drop item on ground i.e. void it
            Some(Some(content)) => {
                content.count += 1;
            }
            Some(slot) => {
                slot.replace(Slot::new(item, 1));
            }
        }

        true
    }

    fn inspect_at(&mut self, world: &mut World, pos: Position) -> Option<String> {
        world.get(pos).map(|item| item.to_string())
    }

    pub fn dig_front(&mut self, world: &mut World) -> bool {
        self.dig_at(world, self.front_pos())
    }
    pub fn dig_up(&mut self, world: &mut World) -> bool {
        self.dig_at(world, self.up_pos())
    }
    pub fn dig_down(&mut self, world: &mut World) -> bool {
        self.dig_at(world, self.down_pos())
    }

    pub fn place_front(&mut self, world: &mut World) -> bool {
        self.place_at(world, self.front_pos())
    }
    pub fn place_up(&mut self, world: &mut World) -> bool {
        self.place_at(world, self.up_pos())
    }
    pub fn place_down(&mut self, world: &mut World) -> bool {
        self.place_at(world, self.down_pos())
    }

    pub fn inspect_front(&mut self, world: &mut World) -> Option<String> {
        self.inspect_at(world, self.front_pos())
    }
    pub fn inspect_up(&mut self, world: &mut World) -> Option<String> {
        self.inspect_at(world, self.up_pos())
    }
    pub fn inspect_down(&mut self, world: &mut World) -> Option<String> {
        self.inspect_at(world, self.down_pos())
    }

    pub fn push_event(&mut self, name: impl Into<String>, mut args: Vec<EventArg>) {
        args.insert(0, EventArg::Str(name.into()));
        self.event_queue.push_back(args);
    }

    pub fn new_websocket(&mut self, url: impl Into<String>) -> Result<usize, String> {
        let (socket, _) = tungstenite::connect(url.into())
            .map_err(|err| format!("failed to connect : {}", err.to_string()))?;
        if let tungstenite::stream::MaybeTlsStream::Plain(s) = socket.get_ref() {
            s.set_nonblocking(true).ok();
        }
        let id = self.next_websocket_id;
        self.next_websocket_id += 1;
        self.websockets.insert(id, socket);

        Ok(id)
    }
}
