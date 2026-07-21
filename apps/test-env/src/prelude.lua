-- TODO: make some method not yield (for ex: getFuelLevel, etc...)
turtle = {}
for name, fn in pairs(nativeTurtle) do
    turtle[name] = function(...)
        local results = table.pack(fn(...))
        coroutine.yield()
        return table.unpack(results, 1, results.n)
    end
end
