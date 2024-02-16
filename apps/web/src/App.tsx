import { Switch, Route, Redirect } from 'wouter'
import Homepage from './pages/Homepage'
import Printerpage from './pages/Printerpage'
import Logpage from './pages/Logpage'
import Configpage from './pages/Configpage'

export default function App() {
    return (
        <Switch>
            <Route path='/'>
                <Homepage />
            </Route>
            <Route path='/dashboard'>
                <Printerpage />
            </Route>
            <Route path='/logs'>
                <Logpage />
            </Route>
            <Route path='/config'>
                <Configpage />
            </Route>
            <Route>
                <Redirect to='/' />
            </Route>
        </Switch>
    )
}
