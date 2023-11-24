import { Switch, Route, Redirect } from 'wouter'
import Homepage from './pages/Homepage'
import Printerpage from './pages/Printerpage'

export default function App() {
    return (
        <Switch>
            <Route path='/'>
                <Homepage />
            </Route>
            <Route path='/dashboard'>
                <Printerpage />
            </Route>
            <Route>
                <Redirect to='/' />
            </Route>
        </Switch>
    )
}
