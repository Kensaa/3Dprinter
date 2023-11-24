local url = "$WEB_URL$"

if fs.exists('printer') then
    fs.delete('printer')
end
sleep(1)
if not pcall(function () shell.run('wget '..url..'/clients/printer.lua printer') end) then
    sleep(1)
    os.reboot()
end
shell.run('printer')