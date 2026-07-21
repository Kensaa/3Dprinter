use std::collections::HashMap;

use crate::turtle::{Heading, TurtleState};

pub type Position = (isize, isize, isize);

pub struct World {
    blocks: HashMap<Position, String>,
    // maps a position to the id of the turtle at that position
    turtle_pos: HashMap<Position, usize>,
    // maps a turtle to its heading
    turtle_heading: HashMap<usize, Heading>,
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

    pub fn set(&mut self, pos: Position, block: impl Into<String>) {
        self.blocks.insert(pos, block.into());
    }

    pub fn remove(&mut self, pos: Position) -> Option<String> {
        self.blocks.remove(&pos)
    }

    pub fn is_air(&self, pos: Position) -> bool {
        self.get(pos).is_none() && self.turtle_pos.get(&pos).is_none()
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
