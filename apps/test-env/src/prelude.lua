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

-- override require
package = {}
package.loaded = {}
package.path = "?.lua;?/init.lua"

function require(name)
    if package.loaded[name] ~= nil then
        return package.loaded[name]
    end

    local path_name = name:gsub("%.", "/")
    local tried = {}
    local source, resolved_path

    for pattern in package.path:gmatch("[^;]+") do
        local candidate = pattern:gsub("%?", path_name)
        table.insert(tried, candidate)
        local h = fs.open(candidate, "r")
        if h then
            source = h.readAll()
            h.close()
            resolved_path = candidate
            break
        end
    end

    if not source then
        error("module '" .. name .. "' not found:\n\tno file '"
            .. table.concat(tried, "'\n\tno file '") .. "'", 2)
    end

    local chunk, err = load(source, "=" .. resolved_path)
    if not chunk then
        error("error loading module '" .. name .. "':\n\t" .. err, 0)
    end

    package.loaded[name] = true -- guards against infinite recursion on require cycles
    local result = chunk(name, resolved_path)
    if result == nil then result = true end
    package.loaded[name] = result
    return result
end

local function wait_for_response(expected_url)
    while true do
        local event, url, p1, p2 = os.pullEvent()
        if event == "http_success" and url == expected_url then
            return p1          -- the response handle
        elseif event == "http_failure" and url == expected_url then
            return nil, p1, p2 -- param here is the error string
        end
    end
end

function http.get(url, headers, binary)
    http.request(url, nil, headers, binary)
    return wait_for_response(url)
end

function http.post(url, body, headers, binary)
    http.request(url, body, headers, binary)
    return wait_for_response(url)
end

shell = {}
function shell.run(cmd)
    local args = {}
    for arg in cmd:gmatch("%S+") do
        -- arg = arg:gsub("^%s*(.-)%s*$", "%1")
        table.insert(args, arg)
    end
    if args[1] == "wget" then
        local function getFilename(url)
            url = url:gsub("[#?].*", ""):gsub("/+$", "")
            return url:match("/([^/]+)$")
        end
        local url = args[2]
        local sFile = args[3] or getFilename(url) or url
        if fs.exists(sFile) then
            error("File already exists")
            return
        end

        local ok, err = http.checkURL(url)
        if not ok then
            error(err or "Invalid URL.")
            return
        end


        local response, err = http.get(url)
        if not response then
            error(err)
            return
        end

        local res = response.readAll()
        response.close()

        if not res then return end

        local file, err = fs.open(sFile, "wb")
        if not file then
            error("Cannot save file: " .. err)
        end

        file.write(res)
        file.close()
    else
        error(cmd .. " unsupported")
    end
end
