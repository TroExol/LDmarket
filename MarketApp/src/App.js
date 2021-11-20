import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Settings } from './pages/Settings';
import { Buys } from './pages/Buys';
import { Sells } from './pages/Sells';
import { Profits } from './pages/Profits';
import { Navbar } from './components/Navbar';
import { AlertState } from './context/alert/AlertState';
import { GeneralInfo } from './pages/GeneralInfo';

function App() {
    return (
        <AlertState>
            <BrowserRouter>
                <Navbar />
                <div className="container py-4 mt-3 d-flex justify-content-center flex-column">
                    <Switch>
                        <Route path={'/'} exact component={GeneralInfo} />
                        <Route path={'/buys'} exact component={Buys} />
                        <Route path={'/sales'} exact component={Sells} />
                        <Route path={'/profits'} exact component={Profits} />
                        <Route path={'/settings'} component={Settings} />
                    </Switch>
                </div>
            </BrowserRouter>
        </AlertState>
    );
}

export default App;
