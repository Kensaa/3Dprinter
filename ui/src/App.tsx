import { Switch, Route, Redirect } from 'wouter'
import Homepage from './pages/Homepage'
import Modelspage from './pages/Modelspage'

export default function App() {
    return (
        <Switch>
            <Route path='/'>
                <Homepage />
            </Route>
            <Route path='/models'>
                <Modelspage />
            </Route>
            <Route>
                <Redirect to='/' />
            </Route>
        </Switch>
    )
}
