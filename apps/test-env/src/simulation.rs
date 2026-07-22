use std::{
    cell::RefCell,
    cmp::Reverse,
    collections::{BinaryHeap, HashMap, HashSet},
    rc::Rc,
};

use mlua::{
    Error, IntoLuaMulti, Lua, MultiValue, Result as LuaResult, Thread, Value, thread::ThreadStatus,
};

use crate::{
    cc_api::register_api,
    turtle::{Heading, TurtleState},
    world::{Position, World},
};

pub struct SimState {
    pub world: World,
    pub turtles: HashMap<usize, TurtleState>,
    next_turtle_id: usize,

    pub clock: u64,

    pub timers: BinaryHeap<Reverse<(u64, usize, usize)>>, // (deadline (clockvalue), timer id, turtle id)
    next_timer_id: usize,
}

pub type SharedState = Rc<RefCell<SimState>>;

impl SimState {
    fn new() -> Self {
        Self {
            world: World::new(),
            turtles: HashMap::new(),
            next_turtle_id: 0,
            clock: 0,
            next_timer_id: 0,
            timers: BinaryHeap::new(),
        }
    }

    fn spawn_turtle(
        &mut self,
        label: Option<impl Into<String>>,
        position: Position,
        heading: Heading,
    ) -> usize {
        let id = self.next_turtle_id;
        self.next_turtle_id += 1;

        let turtle = TurtleState::new(id, label, position, heading);

        self.world.add_turtle(&turtle);
        self.turtles.insert(id, turtle);
        id
    }

    pub fn new_timer(&mut self, turtle_id: usize, deadline: u64) -> usize {
        let id = self.next_timer_id;
        self.next_timer_id += 1;
        // println!(
        //     "\tnew timer for turtle {}, deadline: {}",
        //     turtle_id, deadline
        // );

        self.timers.push(Reverse((deadline, id, turtle_id)));
        id
    }
}

const THREAD_KEY: &str = "sim_main_thread";

pub struct Simulation {
    pub state: SharedState,
    lua_vms: HashMap<usize, Lua>,
    ready: HashSet<usize>, // ids runnable on the next pass
}

const PRELUDE: &str = include_str!("prelude.lua");

impl Simulation {
    pub fn new() -> Self {
        Self {
            state: Rc::new(RefCell::new(SimState::new())),
            lua_vms: HashMap::new(),
            ready: HashSet::new(),
        }
    }

    pub fn add_turtle(
        &mut self,
        source: String,
        label: Option<impl Into<String>>,
        position: Position,
        heading: Heading,
    ) -> LuaResult<usize> {
        let id = self
            .state
            .borrow_mut()
            .spawn_turtle(label, position, heading);

        let lua = Lua::new();
        register_api(&lua, &self.state, id)?;
        lua.load(PRELUDE).exec()?;

        let func = lua
            .load(&source)
            .set_name(format!("=printer {}", id))
            .into_function()?;
        let thread = lua.create_thread(func)?;
        lua.set_named_registry_value(THREAD_KEY, thread)?;

        self.lua_vms.insert(id, lua);
        self.ready.insert(id);
        Ok(id)
    }

    fn resume_turtle(&mut self, id: usize, resume_args: MultiValue) -> LuaResult<()> {
        let lua = self.lua_vms.get(&id).expect("unknown turtle id");
        let thread: Thread = lua.named_registry_value(THREAD_KEY)?;
        if !matches!(thread.status(), ThreadStatus::Resumable) {
            return Ok(());
        }

        let _yielded: MultiValue = thread.resume(resume_args)?;
        // println!("\tturtle {id} yielded with value: {:?}", yielded);
        // if yielded.is_empty() {
        //     println!("\trescheduling turtle {id} for next tick");
        //     self.ready.insert(id);
        // } else {
        //     // TODO: maybe put other event things in here
        // }

        Ok(())
    }

    pub fn step(&mut self) -> LuaResult<()> {
        // Check if any turtle has pending events and promote them to ready if that is the case
        {
            let state = self.state.borrow();

            for (id, t) in state.turtles.iter() {
                if !t.event_queue.is_empty() {
                    println!("\tpromoting {}", id);
                    self.ready.insert(*id);
                }
            }
        }

        let due_now: Vec<usize> = self.ready.drain().collect();
        // Resumes turtle that are ready
        for id in due_now {
            println!("\tdue: {}", id);
            let lua = self
                .lua_vms
                .get(&id)
                .ok_or(Error::RuntimeError("turtle not registered".to_string()))?;

            let resume_args = {
                // Get the resume value (i.e: any event in the queue for this turtle)
                let mut state = self.state.borrow_mut();
                let turtle = state
                    .turtles
                    .get_mut(&id)
                    .ok_or(Error::RuntimeError("turtle not registered".to_string()))?;
                match turtle.event_queue.pop_front() {
                    Some(args) => args.into_lua_multi(&lua),
                    None => Ok(MultiValue::new()),
                }
            }?;
            self.resume_turtle(id, resume_args)?;
        }

        // nothing is runnable anymore, check the timers to find the next one
        if self.ready.is_empty() {
            // println!("\tno more ready thread");
            let next_deadline = {
                let state = self.state.borrow();
                state
                    .timers
                    .peek()
                    .map(|Reverse((deadline, _, _))| *deadline)
            };

            if let Some(deadline) = next_deadline {
                // println!("\tmoving clock to {}ms", deadline);
                let due_timers = {
                    let mut dues = Vec::new();
                    let mut state = self.state.borrow_mut();
                    state.clock = state.clock.max(deadline);
                    while let Some(Reverse(timer)) = state.timers.peek()
                        && timer.0 <= deadline
                    {
                        let (_, timer_id, turtle_id) = state.timers.pop().unwrap().0;
                        dues.push((turtle_id, timer_id));
                    }
                    dues
                };

                for (turtle_id, timer_id) in due_timers {
                    let lua = self.lua_vms.get(&turtle_id).expect("unknown turtle id");
                    let resume_args = MultiValue::from_vec(vec![
                        Value::String(lua.create_string("timer")?),
                        Value::Integer(timer_id as i64),
                    ]);
                    self.resume_turtle(turtle_id, resume_args)?;
                }
            }
        }
        Ok(())
    }

    pub fn all_done(&self) -> LuaResult<bool> {
        for vm in self.lua_vms.values() {
            let thread: Thread = vm.named_registry_value(THREAD_KEY)?;
            if let ThreadStatus::Resumable = thread.status() {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
