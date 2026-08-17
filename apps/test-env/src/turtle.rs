use crate::{
    content_reader::ReadHandleContent,
    filesystem::Node,
    utils::{BlockType, EventArg, HTTPMethod, HTTPRequest, HTTPResponse, Heading, ItemStack},
    world::{BlockDetail, Position, World},
};
use std::{
    cmp::Reverse,
    collections::{BinaryHeap, HashMap, VecDeque},
    format,
    net::TcpStream,
    sync::{atomic::AtomicUsize, mpsc},
    thread,
    time::Instant,
    unreachable,
};
use tungstenite::{WebSocket, stream::MaybeTlsStream};

const INVENTORY_SIZE: usize = 16;

pub struct TurtleState {
    pub id: usize,
    pub label: Option<String>,
    pub position: Position,
    pub heading: Heading,
    pub inventory: [Option<ItemStack>; INVENTORY_SIZE],
    pub selected_slot: usize,
    pub equipment: [Option<ItemStack>; 2],

    pub event_queue: VecDeque<Vec<EventArg>>,

    pub websockets: HashMap<usize, WebSocket<MaybeTlsStream<TcpStream>>>,
    next_websocket_id: usize,

    pub fs_root: Node,

    pub http_requests: Vec<HTTPRequest>,

    pub realtime_timers: BinaryHeap<Reverse<(Instant, usize)>>, // (deadline, timer id)
    pub next_timer_id: usize,
}

#[repr(usize)]
pub enum EquipmentSlot {
    Left = 0,
    Right,
}

static NEXT_TURTLE_ID: AtomicUsize = AtomicUsize::new(0);
pub struct TurtleBuilder {
    label: Option<String>,
    position: Option<Position>,
    heading: Option<Heading>,
    inventory: [Option<ItemStack>; INVENTORY_SIZE],
    equipment: [Option<ItemStack>; 2],
}

impl TurtleBuilder {
    pub fn new() -> TurtleBuilder {
        Self {
            label: None,
            position: None,
            heading: None,
            equipment: Default::default(),
            inventory: Default::default(),
        }
    }
    pub fn build(self) -> TurtleState {
        TurtleState {
            id: NEXT_TURTLE_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            label: self.label,
            position: self.position.unwrap_or((0, 0, 0)),
            heading: self.heading.unwrap_or(Heading::North),
            inventory: self.inventory,
            selected_slot: 1,
            equipment: self.equipment,
            event_queue: Default::default(),
            websockets: Default::default(),
            next_websocket_id: 0,
            fs_root: Node::create_root(),
            http_requests: Default::default(),
            realtime_timers: BinaryHeap::new(),
            next_timer_id: 0,
        }
    }

    pub fn with_label(mut self, label: String) -> Self {
        self.label = Some(label);
        self
    }
    pub fn with_position(mut self, position: Position) -> Self {
        self.position = Some(position);
        self
    }
    pub fn with_heading(mut self, heading: Heading) -> Self {
        self.heading = Some(heading);
        self
    }
    // pub fn with_item(mut self, slot: usize, item: impl Into<String>, count: u8) -> Self {
    pub fn with_item(mut self, slot: usize, itemstack: ItemStack) -> Self {
        assert!(slot > 0);
        assert!(slot <= 16);
        self.inventory[slot - 1] = Some(itemstack);
        self
    }
    pub fn with_equipment(mut self, slot: EquipmentSlot, item: impl Into<String>) -> Self {
        self.equipment[slot as usize] = Some(ItemStack::new(item, 1));
        self
    }
}

impl TurtleState {
    pub fn front_pos(&self) -> Position {
        self.heading + self.position
    }

    pub fn back_pos(&self) -> Position {
        self.heading.opposite() + self.position
    }

    pub fn up_pos(&self) -> Position {
        let (x, y, z) = self.position;
        (x, y + 1, z)
    }

    pub fn down_pos(&self) -> Position {
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

    pub fn get_item_detail(&self, slot: Option<usize>) -> Option<ItemStack> {
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

    pub fn get_equipped_left(&mut self) -> Option<ItemStack> {
        return self.equipment[0].clone();
    }

    pub fn get_equipped_right(&mut self) -> Option<ItemStack> {
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

        world.set(pos, item.to_block());
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

        let digged_block = match world.remove(pos) {
            Some(item) => item,
            None => return false, // TODO: this means that the current turtle tried to dig another turtle, implement better error handling here
        }
        .get_item();

        move_itemstack_to_inventory(&mut self.inventory[self.selected_slot - 1..], digged_block);

        true
    }

    fn inspect_at(&mut self, world: &mut World, pos: Position) -> Option<BlockDetail> {
        world.get_block_detail(pos)
    }

    fn drop_at(&mut self, world: &mut World, pos: Position, count: Option<u8>) -> bool {
        let count = count.unwrap_or(64);
        let slot = &mut self.inventory[self.selected_slot - 1];

        let item = match slot {
            None => {
                return false;
            }
            Some(item) => item,
        };
        let target_block = world.get(pos).cloned();
        match target_block {
            Some(BlockType::Inventory(itemstack)) if itemstack.is_enderchest() => {
                // Not useful but here in case I want to add other inventories that aren't enderchests

                if let Some(nbt) = &itemstack.nbt {
                    let inventory = world.get_enderchest_inventory(nbt.clone());
                    let mut item_copy = item.clone();
                    item_copy.count = item_copy.count.min(count);
                    let moved_items = move_itemstack_to_inventory(inventory, item_copy);
                    if moved_items == 0 {
                        return false;
                    }
                    item.count -= moved_items;
                    if item.count == 0 {
                        *slot = None;
                    }
                }
            }
            _ => {
                item.count -= count.min(item.count);
                if item.count == 0 {
                    *slot = None;
                }
            }
        }
        true
    }

    fn suck_at(&mut self, world: &mut World, pos: Position, count: Option<u8>) -> bool {
        let count = count.unwrap_or(64);
        match world.get(pos).cloned() {
            Some(BlockType::Inventory(block_itemstack)) if block_itemstack.is_enderchest() => {
                if let Some(nbt) = &block_itemstack.nbt {
                    let enderchest_inv = world.get_enderchest_inventory(nbt.clone());
                    if let Some(slot) = enderchest_inv.iter_mut().find(|slot| slot.is_some()) {
                        let item = slot.as_mut().unwrap();
                        let mut item_copy = item.clone();
                        item_copy.count = item.count.min(count);

                        let moved = move_itemstack_to_inventory(&mut self.inventory, item_copy);
                        if moved == 0 {
                            return false;
                        } else {
                            item.count -= moved;
                            if item.count == 0 {
                                *slot = None;
                            }
                            return true;
                        }
                    }
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
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

    pub fn inspect_front(&mut self, world: &mut World) -> Option<BlockDetail> {
        self.inspect_at(world, self.front_pos())
    }
    pub fn inspect_up(&mut self, world: &mut World) -> Option<BlockDetail> {
        self.inspect_at(world, self.up_pos())
    }
    pub fn inspect_down(&mut self, world: &mut World) -> Option<BlockDetail> {
        self.inspect_at(world, self.down_pos())
    }

    pub fn drop_front(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.drop_at(world, self.front_pos(), count)
    }
    pub fn drop_up(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.drop_at(world, self.up_pos(), count)
    }
    pub fn drop_down(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.drop_at(world, self.down_pos(), count)
    }

    pub fn suck_front(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.suck_at(world, self.front_pos(), count)
    }
    pub fn suck_up(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.suck_at(world, self.up_pos(), count)
    }
    pub fn suck_down(&mut self, world: &mut World, count: Option<u8>) -> bool {
        self.suck_at(world, self.down_pos(), count)
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

    pub fn position_from_direction_string(
        &self,
        s: String,
    ) -> Result<(isize, isize, isize), String> {
        let heading = match s.to_lowercase().as_str() {
            "north" => Ok(Heading::North),
            "east" => Ok(Heading::East),
            "south" => Ok(Heading::South),
            "west" => Ok(Heading::West),

            "front" => Ok(self.heading),
            "back" => Ok(self.heading.opposite()),
            "left" => Ok(self.heading.turn_left()),
            "right" => Ok(self.heading.turn_right()),

            _ => Err(format!("cannot convert {} into a direction", s)),
        }?;

        Ok(heading + self.position)
    }

    pub fn new_request(
        &mut self,
        url: String,
        method: HTTPMethod,
        body: Option<String>,
        headers: Vec<(String, String)>,
        binary: bool,
    ) {
        let (sender, receiver) = mpsc::channel();

        thread::spawn({
            let url = url.clone();
            move || {
                let res = if method.has_body() {
                    let mut req = match method {
                        HTTPMethod::POST => ureq::post(url),
                        HTTPMethod::PUT => ureq::put(url),
                        HTTPMethod::PATCH => ureq::patch(url),
                        _ => unreachable!(),
                    };
                    req = req.config().http_status_as_error(false).build().into();
                    req = headers
                        .into_iter()
                        .fold(req, |req, (k, v)| req.header(k, v));

                    if let Some(body) = body {
                        req.send(body)
                    } else {
                        req.send_empty()
                    }
                } else {
                    let mut req = match method {
                        HTTPMethod::GET => ureq::get(url),
                        HTTPMethod::HEAD => ureq::head(url),
                        HTTPMethod::DELETE => ureq::delete(url),
                        HTTPMethod::OPTIONS => ureq::options(url),
                        HTTPMethod::TRACE => ureq::trace(url),
                        _ => unreachable!(),
                    };
                    req = req.config().http_status_as_error(false).build().into();
                    req = headers
                        .into_iter()
                        .fold(req, |req, (k, v)| req.header(k, v));

                    req.call()
                };

                let res = match res {
                    Err(err) => Err(err.to_string()),
                    Ok(res) => {
                        let status = res.status();
                        let headers: HashMap<String, String> = res
                            .headers()
                            .into_iter()
                            .filter_map(|(k, v)| {
                                if let Ok(val) = v.to_str() {
                                    Some((k.to_string(), val.to_string()))
                                } else {
                                    None
                                }
                            })
                            .collect();
                        let body = if binary {
                            res.into_body().read_to_vec().map(ReadHandleContent::from)
                            // ReadHandleContent::from(res.into_body().read_to_vec()?)
                        } else {
                            res.into_body()
                                .read_to_string()
                                .map(ReadHandleContent::from)
                        };
                        match body {
                            Ok(body) => Ok(HTTPResponse {
                                code: status,
                                body,
                                headers,
                            }),
                            Err(err) => Err(err.to_string()),
                        }
                    }
                };
                sender.send(res).unwrap();
            }
        });

        self.http_requests.push(HTTPRequest { url, receiver })
    }

    pub fn new_realtime_timer(&mut self, deadline: Instant) -> usize {
        let id = self.next_timer_id;
        self.next_timer_id += 1;

        self.realtime_timers.push(Reverse((deadline, id)));
        id
    }
}

fn move_itemstack_to_inventory(inventory: &mut [Option<ItemStack>], mut item: ItemStack) -> u8 {
    let start_count = item.count;
    let mut inv_iter = inventory.iter_mut();

    while let Some(slot) = inv_iter.next()
        && item.count != 0
    {
        if let Some(content) = slot {
            if content.name == item.name && content.nbt == item.nbt && content.count < 64 {
                let to_move = (64 - content.count).min(item.count);
                content.count += to_move;
                item.count -= to_move;
            }
        } else {
            slot.replace(item.clone());
            item.count = 0;
        };
    }
    return start_count - item.count;
}
