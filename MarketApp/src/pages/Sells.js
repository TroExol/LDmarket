import React, { useEffect, useRef, useState } from 'react';
import { firestore } from '../utils/firebase';
import { Alert } from '../components/Alert';
import { Table } from 'react-bootstrap';
import { round } from '../utils/misc';
import { Divider, makeStyles, TextField } from '@material-ui/core';
import { throttle } from 'lodash';

const useStyles = makeStyles({
    field: {
        width: '200px',
        margin: '10px 0',
    },
});

export const Sells = () => {
    const classes = useStyles();

    const [nameFilterState, setNameFilterState] = useState('');
    const [sells, setSells] = useState([]);

    const throttled = useRef(
        throttle((filter) => {
            firestore
                .collection('sells')
                .where('item_name', '>=', filter)
                .where('item_name', '<=', filter + '\uf8ff')
                .orderBy('item_name')
                .onSnapshot((sells) => {
                    const updatedSells = [];

                    sells.forEach((sell) => {
                        const sellData = sell.data();
                        const sellId = sell.id;

                        updatedSells.push({ ...sellData, id: sellId });
                    });

                    const sortedSells = updatedSells.sort(
                        (a, b) => b.date.seconds - a.date.seconds,
                    );

                    setSells(() => sortedSells);
                });
        }, 1000),
    );

    useEffect(() => throttled.current(nameFilterState), [nameFilterState]);

    const onNameFilterChangeHandler = (data) => {
        setNameFilterState(() => data.target.value);
    };

    return (
        <div>
            <h1
                className="text-center"
                style={{
                    marginBottom: '20px',
                }}
            >
                История продаж
            </h1>

            <Divider variant="middle" />

            <Alert />

            <div style={{ display: 'flex', justifyContent: 'start' }}>
                <TextField
                    className={classes.field}
                    variant="outlined"
                    label="Название предмета"
                    name="dateFrom"
                    onChange={onNameFilterChangeHandler}
                />
            </div>

            <Divider variant="middle" />

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Предмет</th>
                        <th>Дата продажи</th>
                        <th>Покупка, руб.</th>
                        <th>Продажа, руб.</th>
                        <th>Профит, руб.</th>
                        <th>Профит, %</th>
                    </tr>
                </thead>
                <tbody>
                    {sells.map((sell) => {
                        const id = sell.id;
                        const itemName = sell.item_name;
                        const date = new Date(sell.date.seconds * 1000).toLocaleString();
                        const priceBuy = round(sell.price_buy);
                        const priceSell = round(sell.price_sell);
                        const priceSellWithCommission = sell.price_sell * 0.85;
                        const profitInRub = round(priceSellWithCommission - priceBuy);
                        const profitInPercent = round(
                            (priceSellWithCommission - priceBuy) / (priceBuy / 100),
                        );

                        return (
                            <tr key={id}>
                                <td>{itemName}</td>
                                <td>{date}</td>
                                <td>{priceBuy}</td>
                                <td>{priceSell}</td>
                                <td>{profitInRub}</td>
                                <td>{profitInPercent}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};
