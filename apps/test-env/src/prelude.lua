-- TODO: make some method not yield (for ex: getFuelLevel, etc...)
turtle = {}
---@diagnostic disable-next-line: undefined-global
for name, fn in pairs(nativeTurtle) do
    turtle[name] = function(...)
        local results = table.pack(fn(...))
        coroutine.yield()
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
