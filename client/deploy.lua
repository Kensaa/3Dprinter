function suckAll(start) 
    start = start or 1
    before = turtle.getSelectedSlot()
    for i = start,16 do 
        turtle.select(i)
        local current = turtle.getItemCount()
        if current ~= 0 then
            turtle.suck(64-current)
        else
            turtle.suck()
        end 
    end
    turtle.select(before)
end
function dropAll(start) 
    start = start or 1
    before = turtle.getSelectedSlot()
    for i = start,16 do 
        turtle.select(i)
        turtle.drop()
    end
    turtle.select(before)
end

if turtle.getFuelLevel() == 0 then
    print('please refuel this turtle')
    return
end
print('place following items into the turtle and press ENTER')
print('slot 1 : turtles')
print('slot 2 : disk drive')
print('slot 3 : floppy disk')
read()
turtle.select(1)
num = turtle.getItemCount()
print('place 4 chest behind the turtle and press ENTER')
print('place fuel in the bottom one')
print('place chunkloaders on the one above')
print('place pickaxes on the one above')
print('place modems on the one above')
print('place enderchests on the one above')
read()


-- if disk folder exist before plugging the disk in, delete it
if fs.exists('disk') then
    fs.delete('disk')
end
--creating install disk
turtle.select(2)
turtle.place()
turtle.select(3)
turtle.drop()
sleep(1)
fs.delete('disk/bootstrap')
shell.run('pastebin get Zed0viXR disk/bootstrap')
sleep(1)
turtle.suck()
turtle.select(2)
turtle.dig()

turtle.select(1)
local sSlot = 4

function execute(str,delay)
    delay = delay or 2
    beforeSlot = turtle.getSelectedSlot()

    turtle.up()
    turtle.select(2)
    turtle.place()
    turtle.select(3)
    turtle.drop()
    if fs.exists("disk/startup") then 
        fs.delete("disk/startup")
    end
    io.open("disk/startup","w"):write(str)
    turtle.down()
    peripheral.call('front','reboot')
    sleep(delay)
    turtle.up()
    turtle.suck()
    turtle.select(2)
    turtle.dig()
    turtle.down()

    turtle.select(beforeSlot)
end

for i=1,num do
    turtle.forward()
    turtle.turnLeft()
    turtle.place()
    turtle.turnRight()
end
turtle.turnRight()
turtle.turnRight()
for i=1,num do
    turtle.forward()
end
for i=1,num do
    suckAll(sSlot)
    turtle.turnRight()
    turtle.turnRight()
    for j=1,i do
        turtle.forward()
    end
    turtle.turnLeft()
    dropAll(sSlot)
    execute([[
        for i = 1,16 do
            turtle.select(i)
            turtle.refuel()
        end
        turtle.select(1)
    ]])
    suckAll(sSlot)
    turtle.turnLeft()
    for j=1,i do
        turtle.forward()
    end
end
dropAll(sSlot)

--print('Empty the chest, place the chunkloaders and press ENTER')
--read()

turtle.up()
suckAll(sSlot)
turtle.down()
turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
    turtle.turnLeft()
    for i = sSlot,16 do
        turtle.select(i)
        if turtle.getItemCount() ~= 0 then
            turtle.drop(1)
            break
        end
    end
    execute([[
        turtle.select(1)
        turtle.equipLeft()
    ]])
    turtle.turnRight()
end

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
end
turtle.up()
dropAll(sSlot)
turtle.down()

--print('Empty the chest, place the pickaxes and press ENTER')
--read()

for i=1,num do
    turtle.up()
    turtle.up()
    turtle.select(sSlot)
    turtle.suck(1)
    turtle.down()
    turtle.down()
    turtle.turnRight()
    turtle.turnRight()
    for j=1,i do
        turtle.forward()
    end
    turtle.turnLeft()
    turtle.select(sSlot)
    turtle.drop(1)
    execute([[
        turtle.select(1)
        turtle.equipRight()
    ]])
    turtle.turnLeft()
    for j=1,i do
        turtle.forward()
    end
end

--print('Empty the chest, place the modems and press ENTER')
--read()

turtle.up()
turtle.up()
turtle.up()
turtle.select(sSlot)
turtle.suck()
turtle.down()
turtle.down()
turtle.down()

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
    turtle.turnLeft()
    turtle.drop(1)
    execute([[
        turtle.select(1)
        turtle.transferTo(15,1)
    ]])
    turtle.turnRight()
end

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
end
turtle.up()
turtle.up()
turtle.up()
turtle.drop()

turtle.up()
turtle.select(sSlot)
turtle.suck()
turtle.down()
turtle.down()
turtle.down()
turtle.down()

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
    turtle.turnLeft()
    turtle.drop(1)
    execute([[
        turtle.select(1)
        turtle.transferTo(16,1)
    ]])
    turtle.turnRight()
end

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
end

turtle.up()
turtle.up()
turtle.up()
turtle.up()
turtle.drop()
turtle.down()
turtle.down()
turtle.down()
turtle.down()

turtle.turnLeft()
turtle.turnLeft()

for i=1,num do
    turtle.forward()
    turtle.turnLeft()
    execute([[
        os.setComputerLabel("printer ]]..i..[[")
        fs.copy("disk/bootstrap","startup")
        sleep(5)
        os.reboot()
    ]])
    turtle.turnRight()
end

turtle.turnLeft()
turtle.turnLeft()
for i=1,num do
    turtle.forward()
end
turtle.turnLeft()
turtle.turnLeft()
