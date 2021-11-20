import React, { useEffect, useState } from 'react';
import { firestore } from '../utils/firebase';
import { Alert } from '../components/Alert';
import { Table } from 'react-bootstrap';
import { Divider, makeStyles, TextField } from '@material-ui/core';
import moment from 'moment';
import { round } from '../utils/misc';

const useStyles = makeStyles({
    field: {
        width: '200px',
        margin: '10px 0',
    },
});

export const Profits = () => {
    const minDate = '2021-06-18';

    const classes = useStyles();

    const [profits, setProfits] = useState({});
    const [generalProfit, setGeneralProfit] = useState();
    const [datePickerState, setDatePickerState] = useState([
        moment().subtract(7, 'day').format('yyyy-MM-DD'),
        moment().format('yyyy-MM-DD'),
    ]);

    useEffect(() => {
        const dateFrom = moment(datePickerState[0] + ' 00:00:00', 'yyyy-MM-DD HH:mm:ss').toDate();
        const dateTo = moment(datePickerState[1] + ' 23:59:59', 'yyyy-MM-DD HH:mm:ss').toDate();

        firestore
            .collection('sells')
            .where('date', '>=', dateFrom)
            .where('date', '<=', dateTo)
            .orderBy('date', 'desc')
            .onSnapshot((sells) => {
                const updatedProfits = {};

                sells.forEach((sell) => {
                    const sellData = sell.data();

                    const date = new Date(sellData.date.seconds * 1000).toLocaleDateString();
                    const profit = sellData.price_sell * 0.85 - sellData.price_buy;

                    if (updatedProfits[date]) {
                        updatedProfits[date] += profit;
                    } else {
                        updatedProfits[date] = profit;
                    }
                });

                setProfits(() => updatedProfits);

                const totalDays = Object.keys(updatedProfits).length;
                const totalProfit = Object.values(updatedProfits).reduce(
                    (sum, num) => sum + num,
                    0,
                );
                const averageProfit = totalDays
                    ? Object.values(updatedProfits).reduce((sum, num) => sum + num, 0) / totalDays
                    : 0;

                setGeneralProfit(() => ({
                    totalDays,
                    totalProfit,
                    averageProfit,
                }));
            });
    }, [datePickerState]);

    const onDateFromChangeHandler = (data) => {
        const newState = [...datePickerState];

        newState[0] = data.target.value;

        setDatePickerState(() => newState);
    };

    const onDateToChangeHandler = (data) => {
        const newState = [...datePickerState];

        newState[1] = data.target.value;

        setDatePickerState(() => newState);
    };

    return (
        <div>
            <h1
                className="text-center"
                style={{
                    marginBottom: '20px',
                }}
            >
                Профит
            </h1>

            <Divider variant="middle" />

            {generalProfit?.totalDays ? (
                <p>
                    Дней: {generalProfit.totalDays} <br />
                    Всего: {round(generalProfit.totalProfit)} руб (
                    {round(generalProfit.totalProfit * 0.85)} руб) <br />
                    Средняя: {round(generalProfit.averageProfit)} руб (
                    {round(generalProfit.averageProfit * 0.85)} руб)
                </p>
            ) : (
                'Нет данных за этот промежуток времени'
            )}

            <Divider variant="middle" />

            <Alert />

            <div style={{ display: 'flex', justifyContent: 'start' }}>
                <TextField
                    className={classes.field}
                    variant="outlined"
                    label="Дата с"
                    type="date"
                    InputLabelProps={{
                        shrink: true,
                    }}
                    value={datePickerState[0]}
                    inputProps={{
                        max: datePickerState[1],
                    }}
                    error={!datePickerState[0]}
                    helperText={!datePickerState[0] && 'Введите начало периода'}
                    name="dateFrom"
                    onChange={onDateFromChangeHandler}
                    onKeyDown={(event) => {
                        event.preventDefault();
                    }}
                />
                <TextField
                    className={classes.field}
                    variant="outlined"
                    label="Дата по"
                    type="date"
                    InputLabelProps={{
                        shrink: true,
                    }}
                    value={datePickerState[1]}
                    inputProps={{
                        min: datePickerState[0],
                        max: moment().format('yyyy-MM-DD'),
                    }}
                    error={!datePickerState[1]}
                    helperText={!datePickerState[1] && 'Введите конец периода'}
                    name="dateTo"
                    onChange={onDateToChangeHandler}
                    onKeyDown={(event) => {
                        event.preventDefault();
                    }}
                />
            </div>

            <Divider variant="middle" />

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Профит</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(profits).map(([date, profit]) => (
                        <tr key={date}>
                            <td>{date}</td>
                            <td>{round(profit)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
