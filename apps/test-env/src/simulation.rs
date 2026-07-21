use std::{cell::RefCell, collections::HashMap, rc::Rc};

use mlua::{Error, Lua, MultiValue, Result as LuaResult, Thread, thread::ThreadStatus};

use crate::{
    cc_api::register_api,
    turtle::{Heading, Slot, TurtleState},
    world::{Position, World},
};

pub struct SimState {
    pub world: World,
    pub turtles: HashMap<usize, TurtleState>,
    next_id: usize,
}

pub type SharedState = Rc<RefCell<SimState>>;

impl SimState {
    fn new() -> Self {
        Self {
            world: World::new(),
            turtles: HashMap::new(),
            next_id: 0,
        }
    }

    fn spawn_turtle(&mut self, position: Position, heading: Heading) -> usize {
        let id = self.next_id;
        self.next_id += 1;

        let mut turtle = TurtleState::new(id, position, heading);
        turtle.inventory[0].replace(Slot::new("test", 1));
        turtle.inventory[8].replace(Slot::new("test2", 5));

        self.world.add_turtle(&turtle);
        self.turtles.insert(id, turtle);
        id
    }
}

struct LuaVm {
    id: usize,
    lua: Lua,
}

const THREAD_KEY: &str = "sim_main_thread";

pub struct Simulation {
    pub state: SharedState,
    vms: Vec<LuaVm>,
}

const PRELUDE: &str = include_str!("prelude.lua");

impl Simulation {
    pub fn new() -> Self {
        Self {
            state: Rc::new(RefCell::new(SimState::new())),
            vms: Vec::new(),
        }
    }

    pub fn add_turtle(
        &mut self,
        source: String,
        position: Position,
        heading: Heading,
    ) -> LuaResult<usize> {
        let id = self.state.borrow_mut().spawn_turtle(position, heading);

        let lua = Lua::new();
        register_api(&lua, &self.state, id)?;
        lua.load(PRELUDE).exec()?;

        let func = lua
            .load(&source)
            .set_name(format!("=printer {}", id))
            .into_function()?;
        let thread = lua.create_thread(func)?;
        lua.set_named_registry_value(THREAD_KEY, thread)?;

        self.vms.push(LuaVm { id, lua });
        Ok(id)
    }

    pub fn step(&mut self) -> LuaResult<()> {
        for vm in &self.vms {
            let thread: Thread = vm.lua.named_registry_value(THREAD_KEY)?;
            if let ThreadStatus::Resumable = thread.status() {
                // println!("running {}", vm.id);
                let _yielded: MultiValue = thread.resume(MultiValue::new())?;
                if let ThreadStatus::Error = thread.status() {
                    return Err(Error::RuntimeError(format!("turtle '{}' errored", vm.id)));
                }
            }
        }
        Ok(())
    }

    pub fn all_done(&self) -> LuaResult<bool> {
        for vm in &self.vms {
            let thread: Thread = vm.lua.named_registry_value(THREAD_KEY)?;
            if let ThreadStatus::Resumable = thread.status() {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
