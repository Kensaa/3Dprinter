use mlua::{IntoLua, Lua, Value};
use std::collections::HashMap;

use crate::turtle::{Heading, TurtleState};

pub type Position = (isize, isize, isize);

pub struct World {
    pub blocks: HashMap<Position, String>,
    // maps a position to the id of the turtle at that position
    pub turtle_pos: HashMap<Position, usize>,
    // maps a turtle to its heading
    pub turtle_heading: HashMap<usize, Heading>,
}

#[derive(Clone, Default)]
pub struct BlockState {
    facing: Option<String>,
}
#[derive(Clone)]
pub struct BlockDetail {
    name: String,
    state: BlockState,
}
impl IntoLua for BlockState {
    fn into_lua(self, lua: &Lua) -> mlua::prelude::LuaResult<Value> {
        let table = lua.create_table()?;
        if let Some(facing) = self.facing {
            table.set("facing", facing)?;
        }
        Ok(Value::Table(table))
    }
}
impl IntoLua for BlockDetail {
    fn into_lua(self, lua: &Lua) -> mlua::prelude::LuaResult<Value> {
        let table = lua.create_table()?;
        table.set("name", self.name)?;
        table.set("state", self.state.into_lua(lua)?)?;
        Ok(Value::Table(table))
    }
}

impl World {
    pub fn new() -> Self {
        Self {
            blocks: HashMap::new(),
            turtle_pos: HashMap::new(),
            turtle_heading: HashMap::new(),
        }
    }

    pub fn get(&self, pos: Position) -> Option<&str> {
        self.blocks.get(&pos).map(|s| s.as_str())
    }

    pub fn get_block_detail(&self, pos: Position) -> Option<BlockDetail> {
        if let Some(block) = self.get(pos) {
            return Some(BlockDetail {
                name: block.to_string(),
                state: BlockState::default(),
            });
        } else if let Some(turtle) = self.turtle_pos.get(&pos) {
            let heading = self.turtle_heading.get(turtle).unwrap();
            return Some(BlockDetail {
                name: "computercraft:turtle_advanced".to_string(),
                state: BlockState {
                    facing: Some(heading.string()),
                },
            });
        }

        return None;
    }

    pub fn set(&mut self, pos: Position, block: impl Into<String>) {
        self.blocks.insert(pos, block.into());
    }

    pub fn remove(&mut self, pos: Position) -> Option<String> {
        self.blocks.remove(&pos)
    }

    pub fn is_block(&self, pos: Position) -> bool {
        self.get(pos).is_some()
    }

    pub fn is_turtle(&self, pos: Position) -> bool {
        self.turtle_pos.get(&pos).is_some()
    }

    pub fn is_air(&self, pos: Position) -> bool {
        !self.is_block(pos) && !self.is_turtle(pos)
    }

    pub fn move_turtle(&mut self, turtle: &mut TurtleState, new_position: Position) {
        self.turtle_pos
            .remove(&turtle.position)
            .expect("turtle didn't have a position in the world");
        turtle.position = new_position;
        self.turtle_pos.insert(turtle.position, turtle.id);
    }

    pub fn turn_turtle(&mut self, turtle: &mut TurtleState, new_heading: Heading) {
        self.turtle_heading
            .remove(&turtle.id)
            .expect("turtle didn't have a heading in the world");
        turtle.heading = new_heading;
        self.turtle_heading.insert(turtle.id, turtle.heading);
    }

    pub fn add_turtle(&mut self, turtle: &TurtleState) {
        self.turtle_pos.insert(turtle.position, turtle.id);
        self.turtle_heading.insert(turtle.id, turtle.heading);
    }
}
