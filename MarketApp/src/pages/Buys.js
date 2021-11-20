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

export const Buys = () => {
    const classes = useStyles();

    const [nameFilterState, setNameFilterState] = useState('');
    const [buys, setBuys] = useState([]);

    const throttled = useRef(
        throttle((filter) => {
            firestore
                .collection('buys')
                .where('item_name', '>=', filter)
                .where('item_name', '<=', filter + '\uf8ff')
                .orderBy('item_name')
                .onSnapshot((buys) => {
                    const updatedBuys = [];

                    buys.forEach((buy) => {
                        const buyData = buy.data();
                        const buyId = buy.id;

                        updatedBuys.push({ ...buyData, id: buyId });
                    });

                    const sortedBuys = updatedBuys.sort((a, b) => b.date.seconds - a.date.seconds);

                    setBuys(() => sortedBuys);
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
                История покупок
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
                        <th>Дата покупки</th>
                        <th>Покупка, руб.</th>
                        <th>Продажа, руб.</th>
                        <th>Профит, руб.</th>
                        <th>Профит, %</th>
                        <th>Продан</th>
                    </tr>
                </thead>
                <tbody>
                    {buys.map((buy) => {
                        const id = buy.id;
                        const itemName = buy.item_name;
                        const date = new Date(buy.date.seconds * 1000).toLocaleString();
                        const priceBuy = round(buy.price_buy);
                        const priceSell = round(buy.price_sell);
                        const priceSellWithCommission = buy.price_sell * 0.85;
                        const profitInRub = round(priceSellWithCommission - priceBuy);
                        const profitInPercent = round(
                            (priceSellWithCommission - priceBuy) / (priceBuy / 100),
                        );
                        const isSold = buy.sold ? 'Да' : 'Нет';

                        return (
                            <tr key={id}>
                                <td>{itemName}</td>
                                <td>{date}</td>
                                <td>{priceBuy}</td>
                                <td>{priceSell}</td>
                                <td>{profitInRub}</td>
                                <td>{profitInPercent}</td>
                                <td
                                    style={{
                                        color: buy.sold ? 'green' : 'red',
                                    }}
                                >
                                    {isSold}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};
