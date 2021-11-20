import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar = () => (
    <nav className="navbar navbar-light navbar-expand-lg bg-light justify-content-center">
        <ul className="navbar-nav align-items-center">
            <li className="nav-item">
                <NavLink className="nav-link" to="/" exact>
                    Общая информация
                </NavLink>
            </li>
            <li className="nav-item">
                <NavLink className="nav-link" to="/buys">
                    История покупок
                </NavLink>
            </li>
            <li className="nav-item">
                <NavLink className="nav-link" to="/sales">
                    История продаж
                </NavLink>
            </li>
            <li className="nav-item">
                <NavLink className="nav-link" to="/profits">
                    Профит
                </NavLink>
            </li>
            <li className="nav-item">
                <NavLink className="nav-link" to="/settings">
                    Настройки
                </NavLink>
            </li>
        </ul>
    </nav>
);
