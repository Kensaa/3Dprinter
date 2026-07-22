-- tests/test_parallel.lua
-- coroutine.yield()
-- os.pullEventRaw()
-- sleep(1)
print("== waitForAll: unequal durations ==")
local function slow()
    print(("slow: start @ clock=%d"):format(os.clock and os.clock() or 0))
    sleep(3)
    turtle.forward()
    print("slow: done")
end

local function fast()
    for i = 1, 3 do
        sleep(1)
        print("fast: tick " .. i)
    end
    turtle.turnRight()
    print("fast: done")
end

parallel.waitForAll(slow, fast)
print("waitForAll finished\n")

print("== waitForAny: first to finish wins ==")
local function short_sleep()
    sleep(1)
    print("short_sleep: woke up first, returning")
end

local function long_sleep()
    sleep(10)
    print("long_sleep: should NEVER print this")
end

local winner = parallel.waitForAny(short_sleep, long_sleep)
print("waitForAny returned index " .. winner .. " (expected 1)\n")

print("== waitForAll with spawn ==")
parallel.waitForAll(function(spawn)
    print("spawner: starting")
    spawn(function()
        sleep(2)
        print("spawned A: done")
    end)
    spawn(function()
        sleep(1)
        print("spawned B: done")
    end)
    sleep(3)
    print("spawner: done")
end)
print("spawn test finished")
