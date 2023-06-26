if fs.exists('printer') then
    fs.delete('printer')
end
shell.run('pastebin get mpuxagdY printer')
shell.run('printer')