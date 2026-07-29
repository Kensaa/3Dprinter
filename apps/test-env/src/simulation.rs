use std::{
    cell::RefCell,
    cmp::Reverse,
    collections::{BinaryHeap, HashMap, HashSet},
    io,
    rc::Rc,
    sync::mpsc,
    vec,
};

use mlua::{
    Error, IntoLua, Lua, MultiValue, Result as LuaResult, Table, Thread, Value,
    thread::ThreadStatus,
};

use crate::{
    cc_api::register_api,
    content_reader::make_read_handle,
    turtle::{EventArg, HTTPResponse, Heading, TurtleState},
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
        lua.load(PRELUDE).set_name("=PRELUDE").exec()?;

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

    fn resume_turtle(&mut self, turtle_id: usize, resume_args: MultiValue) -> LuaResult<()> {
        let lua = self.lua_vms.get(&turtle_id).expect("unknown turtle id");
        let thread: Thread = lua.named_registry_value(THREAD_KEY)?;
        if !matches!(thread.status(), ThreadStatus::Resumable) {
            return Ok(());
        }

        let _yielded: MultiValue = thread.resume(resume_args)?;

        // Check if the turtle is finished and close websockets still open
        if matches!(thread.status(), ThreadStatus::Finished) {
            let mut state = self.state.borrow_mut();
            state
                .turtles
                .get_mut(&turtle_id)
                .unwrap()
                .websockets
                .drain()
                .map(|(_, mut socket)| socket.close(None))
                .collect::<Result<Vec<()>, tungstenite::Error>>()
                .map_err(|err| {
                    Error::RuntimeError(format!("failed to close socket : {}", err.to_string()))
                })?;
        }
        Ok(())
    }

    fn poll_sockets(&self, turtle: &mut TurtleState) -> LuaResult<()> {
        let messages = turtle
            .websockets
            .iter_mut()
            .map(|(ws_id, ws)| match ws.read() {
                Ok(msg) => {
                    let is_binary = msg.is_binary();
                    let msg = if is_binary {
                        String::from_utf8(msg.into_data().into_iter().collect()).map_err(|err| {
                            Error::RuntimeError(format!(
                                "failed to get message content : {}",
                                err.to_string()
                            ))
                        })
                    } else {
                        msg.to_text()
                            .map_err(|err| {
                                Error::RuntimeError(format!(
                                    "failed to get message content : {}",
                                    err.to_string()
                                ))
                            })
                            .map(|str| str.to_string())
                    }?;
                    Ok(Some(vec![
                        EventArg::Int(*ws_id as i64),
                        EventArg::Str(msg),
                        EventArg::Bool(is_binary),
                    ]))
                }
                Err(tungstenite::Error::Io(ref e)) if e.kind() == io::ErrorKind::WouldBlock => {
                    Ok(None)
                }
                Err(err) => {
                    return Err(Error::RuntimeError(format!(
                        "An error occured while polling websockets for turtle {} : {}",
                        turtle.id,
                        err.to_string()
                    )));
                }
            })
            .collect::<Result<Vec<Option<Vec<EventArg>>>, Error>>()?
            .into_iter()
            .filter_map(|msg| msg);
        for msg in messages {
            turtle.push_event("websocket_message", msg);
        }
        Ok(())
    }

    fn poll_requests(&self, turtle: &mut TurtleState) -> LuaResult<()> {
        let lua = self.lua_vms.get(&turtle.id).expect("unknown turtle id");
        fn make_response_handle(lua: &Lua, response: HTTPResponse) -> LuaResult<Table> {
            let handle = make_read_handle(lua, response.body)?;

            handle.set(
                "getResponseCode",
                lua.create_function(move |_, ()| Ok(response.code.as_u16()))?,
            )?;

            handle.set(
                "getResponseHeaders",
                lua.create_function(move |lua, ()| {
                    let t = lua.create_table()?;
                    for (k, v) in &response.headers {
                        t.set(k.as_str(), v.as_str())?;
                    }
                    Ok(t)
                })?,
            )?;

            Ok(handle)
        }

        let mut events = Vec::new();
        turtle
            .http_requests
            .retain(|req| match req.receiver.try_recv() {
                Ok(Ok(response)) => {
                    let code = response.code.clone();
                    match make_response_handle(lua, response) {
                        Ok(handle) if code.is_success() => events.push((
                            "http_success",
                            vec![EventArg::Str(req.url.clone()), EventArg::Table(handle)],
                        )),
                        Ok(handle) => events.push((
                            "http_failure",
                            vec![
                                EventArg::Str(req.url.clone()),
                                EventArg::Str(
                                    code.canonical_reason()
                                        .unwrap_or("request failed")
                                        .to_string(),
                                ),
                                EventArg::Table(handle),
                            ],
                        )),
                        Err(e) => events.push((
                            "http_failure",
                            vec![
                                EventArg::Str(req.url.clone()),
                                EventArg::Str(format!("internal error building response: {e}")),
                            ],
                        )),
                    }
                    false
                }
                Ok(Err(error)) => {
                    events.push((
                        "http_failure",
                        vec![EventArg::Str(req.url.clone()), EventArg::Str(error)],
                    ));
                    false
                }
                Err(mpsc::TryRecvError::Empty) => true, // still in flight
                Err(mpsc::TryRecvError::Disconnected) => false, // thread panicked
            });

        for (name, args) in events {
            turtle.push_event(name, args);
        }
        Ok(())
    }

    pub fn step(&mut self) -> LuaResult<()> {
        // Promotes any turtle that has a websocket message pending
        {
            let mut state = self.state.borrow_mut();
            for (id, turtle) in state.turtles.iter_mut() {
                // Collect messages pending from each websocket
                self.poll_sockets(turtle)?;
                self.poll_requests(turtle)?;

                // Check if any turtle has pending events and promote them to ready if that is the case
                if !turtle.event_queue.is_empty() {
                    self.ready.insert(*id);
                }
            }
        }

        let due_now: Vec<usize> = self.ready.drain().collect();
        // Resumes turtle that are ready
        for id in due_now {
            // println!("\tdue: {}", id);
            let lua = self
                .lua_vms
                .get(&id)
                .ok_or(Error::RuntimeError("turtle not registered".to_string()))?;

            // Get the resume value (i.e: any event in the queue for this turtle)
            let resume_args = {
                let mut state = self.state.borrow_mut();
                let turtle = state
                    .turtles
                    .get_mut(&id)
                    .ok_or(Error::RuntimeError("turtle not registered".to_string()))?;
                match turtle.event_queue.pop_front() {
                    Some(args) => {
                        let args = args
                            .into_iter()
                            .map(|arg| arg.into_lua(&lua))
                            .collect::<Result<Vec<Value>, Error>>()?;
                        Ok::<_, Error>(MultiValue::from_vec(args))
                    }

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
