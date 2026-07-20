local module = { receivedMessages = {}, registerBody = nil, ws = nil }

local MAX_RETRIES = 5

function module.connect(connect_url, register_body, retry)
    retry = retry or 0
    ws, err = http.websocket(connect_url)
    if not ws then
        print('Unable to connect to server, error : ')
        print(err)
        if retry > MAX_RETRIES then
            retry = MAX_RETRIES
        end
        print('Retrying in ' .. 3 ^ retry .. ' seconds')
        sleep(3 ^ retry)
        module.connect(connect_url, register_body, retry + 1)
    else
        print('Connected !')
        module.ws = ws
        module.sendRequestAndWaitForResponse("register", register_body)
        module.register_body = register_body
        module.connect_url = connect_url
    end
end

function module.send(body)
    if module.ws == nil then
        print('Not connected, unable to send message to server')
        return false
    end
    success = pcall(function() module.ws.send(json.encode(body)) end)
    if not success then
        print('Unable to send message to server')
    end
    return success
end

function receive()
    local _, _, response, isBinary = os.pullEvent("websocket_message")
    if not isBinary then
        return json.decode(response)
    end
    return {}
end

-- Function meant to be ran in the background listening for message
function module.receiveLoop()
    while true do
        rec = receive()
        table.insert(module.receivedMessages, rec)
    end
end

-- Function meant to be ran in the background sending pings to the server to test connection
function module.pingLoop()
    while true do
        if module.ws ~= nil then
            local response = module.sendRequestAndWaitForResponse('ping', {}, 5)
            if response == nil then
                print('server is not responding, waiting 10 seconds')
                module.ws = nil

                sleep(10)
                print('Reconnecting')
                if module.register_body == nil then
                    print('No register body, unable to reconnect')
                    return
                end
                module.connect(module.connect_url, module.register_body)
            end
        end
        sleep(5)
    end
end

-- Is t1 a "subtable" of t2?
function matchTable(t1, t2)
    if type(t1) ~= 'table' or type(t2) ~= 'table' then
        return false
    end
    for k, v in pairs(t1) do
        if type(v) == 'table' then
            if not matchTable(v, t2[k]) then
                return false
            end
        else
            if t2[k] ~= v then
                return false
            end
        end
    end
    return true
end

-- block until a message matching the given pattern is found in the recieved message queue, or after a timeout
function module.waitForMessage(pattern, timeout)
    timeout = timeout or -1
    local waited = 0
    local waitTime = 0.2

    local found = nil
    while found == nil do
        for _, receivedMessage in pairs(module.receivedMessages) do
            if matchTable(pattern, receivedMessage) then
                found = receivedMessage
                break
            end
        end
        sleep(waitTime)
        waited = waited + waitTime
        if timeout > 0 and waited >= timeout then
            return nil
        end
    end
    -- we remove the fonud message from the list
    local newMessages = {}
    for _, v in pairs(module.receivedMessages) do
        if v ~= found then
            table.insert(newMessages, v)
        end
    end
    module.receivedMessages = newMessages
    return found
end

-- Send a the request of type `request` with body `body`
function module.sendRequest(request, body)
    return module.send({ type = "request", body = { request = request, body = body or {} } })
end

-- Send a response for the request `request`, with response `response` if `error` is nil, or send `error` if it is not null
function module.sendResponse(request, response, error)
    if error ~= nil then
        return module.send({ type = "response", body = { request = request, success = false, error = error } })
    else
        return module.send({ type = "response", body = { request = request, success = true, response = response or {} } })
    end
end

-- Send a the request of type `request` with body `body` and return the response for the server
function module.sendRequestAndWaitForResponse(request, body, timeout)
    local sendSuccess = module.sendRequest(request, body)
    if not sendSuccess then
        return nil
    end
    local response = module.waitForMessage({ type = 'response', body = { request = request } }, timeout)
    if response == nil then
        return nil
    else
        if response.body.success then
            return response.body.response, response
        else
            print('Request ' .. response.body.request .. ' returned an error : ' .. response.body.error)
        end
    end
end

return module
