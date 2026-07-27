-- TODO: make some method not yield (for ex: getFuelLevel, etc...)
turtle = {}
---@diagnostic disable-next-line: undefined-global
for name, fn in pairs(nativeTurtle) do
    turtle[name] = function(...)
        local results = table.pack(fn(...))
        sleep(0)
        return table.unpack(results, 1, results.n)
    end
end

function os.pullEventRaw(filter)
    return coroutine.yield(filter)
end

function os.pullEvent(filter)
    while true do
        local event = { os.pullEventRaw(filter) }
        if filter == nil or event[1] == filter then
            return table.unpack(event)
        end
    end
end

function sleep(t)
    local id = os.startTimer(t or 0)
    while true do
        local _, tid = os.pullEvent("timer")
        if tid == id then return end
    end
end

parallel = {}

local function expect_fn(i, fn)
    if type(fn) ~= "function" then
        error("bad argument #" .. i .. " (function expected, got " .. type(fn) .. ")", 3)
    end
end

function parallel.waitForAny(...)
    local functions = table.pack(...)
    local threads = {}
    for i = 1, functions.n do
        local fn = functions[i]
        expect_fn(i, fn)
        threads[i] = { co = coroutine.create(fn), filter = nil }
    end

    local count = functions.n
    if count < 1 then return 0 end

    local event = { n = 0 }
    while true do
        for i = 1, count do
            local thread = threads[i]
            if thread.filter == nil or thread.filter == event[1] or event[1] == "terminate" then
                local ok, param = coroutine.resume(thread.co, table.unpack(event, 1, event.n))
                if not ok then error(param, 0) end
                if coroutine.status(thread.co) == "dead" then return i end
                thread.filter = param
            end
        end
        event = table.pack(os.pullEventRaw())
    end
end

function parallel.waitForAll(...)
    local can_spawn, threads, count = false, {}, 0

    local function spawn(fn, ...)
        expect_fn(1, fn)
        if not can_spawn then error("Cannot spawn new functions outside of waitForAll", 2) end
        threads[count + 1] = {
            co = coroutine.create(fn),
            filter = nil,
            resume_with = table.pack(...),
        }
        count = count + 1
    end

    local functions = table.pack(...)
    can_spawn = true
    for i = 1, functions.n do
        local fn = functions[i]
        expect_fn(i, fn)
        spawn(fn, spawn)
    end
    can_spawn = false

    local event = { n = 0 }
    while true do
        local i = 1
        while i <= count do
            local thread = threads[i]

            local resume_with
            if thread.resume_with then
                resume_with = thread.resume_with
                thread.resume_with = nil
            elseif thread.filter == nil or thread.filter == event[1] or event[1] == "terminate" then
                resume_with = event
            end

            if resume_with then
                can_spawn = true
                local ok, param = coroutine.resume(thread.co, table.unpack(resume_with, 1, resume_with.n))
                can_spawn = false

                if not ok then error(param, 0) end

                if coroutine.status(thread.co) == "dead" then
                    table.remove(threads, i)
                    i, count = i - 1, count - 1
                else
                    thread.filter = param
                end
            end

            i = i + 1
        end

        if count == 0 then return end
        event = table.pack(os.pullEventRaw())
    end
end

function __wrapWebSocketHandle(handle, id)
    function handle.receive(timeout)
        local timer_id = timeout and os.startTimer(timeout) or nil
        while true do
            local event, a, b, c = os.pullEvent()
            if event == "websocket_message" and a == id then
                return b, c -- message, isBinary
            elseif event == "websocket_closed" and a == id then
                return nil, "Connection closed"
            elseif timer_id and event == "timer" and a == timer_id then
                return nil, "Timeout"
            end
        end
    end

    return handle
end
