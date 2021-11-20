import React, { useEffect, useState } from 'react';
import { firestore } from '../utils/firebase';
import { Alert } from '../components/Alert';
import { Table } from 'react-bootstrap';
import { round } from '../utils/misc';
import moment from 'moment';
import firebase from 'firebase';

export const GeneralInfo = () => {
    const [buysInfo, setBuysInfo] = useState([]);
    const [sellsInfo, setSellsInfo] = useState([]);
    const [generalInfo, setGeneralInfo] = useState([]);

    useEffect(() => {
        setGeneralInfo(() => [...buysInfo, ...sellsInfo]);
    }, [buysInfo, sellsInfo]);

    useEffect(async () => {
        firestore.collection('buys').onSnapshot((buys) => {
            const updatedInfo = [];

            let totalBuys = 0;
            let todayBuys = 0;

            buys.forEach((buy) => {
                const buyData = buy.data();

                totalBuys++;
                if (
                    moment(buyData.date.seconds * 1000).format('yyyy-MM-DD') ===
                    moment().format('yyyy-MM-DD')
                ) {
                    todayBuys++;
                }
            });

            updatedInfo.push({ name: 'Общее число покупок', value: totalBuys });
            updatedInfo.push({ name: 'Число покупок за сегодня', value: todayBuys });

            setBuysInfo(() => updatedInfo);
        });

        firestore.collection('sells').onSnapshot((sells) => {
            const updatedInfo = [];

            let totalSells = 0;
            let todaySells = 0;
            let todayProfit = 0;
            let yesterdayProfit = 0;
            let totalProfit = 0;

            sells.forEach((sell) => {
                const sellData = sell.data();

                totalSells++;
                totalProfit += sellData.price_sell * 0.85 - sellData.price_buy;

                if (
                    moment(sellData.date.seconds * 1000).format('yyyy-MM-DD') ===
                    moment().format('yyyy-MM-DD')
                ) {
                    todaySells++;
                    todayProfit += sellData.price_sell * 0.85 - sellData.price_buy;
                } else if (
                    moment(sellData.date.seconds * 1000).format('yyyy-MM-DD') ===
                    moment().subtract(1, 'day').format('yyyy-MM-DD')
                ) {
                    yesterdayProfit += sellData.price_sell * 0.85 - sellData.price_buy;
                }
            });

            updatedInfo.push({ name: 'Общее число продаж', value: totalSells });
            updatedInfo.push({ name: 'Число продаж за сегодня', value: todaySells });
            updatedInfo.push({ name: 'Прибыль за сегодня', value: round(todayProfit) });
            updatedInfo.push({ name: 'Прибыль за вчера', value: round(yesterdayProfit) });
            updatedInfo.push({ name: 'Текущая прибыль', value: round(totalProfit) });

            setSellsInfo(() => updatedInfo);
        });
    }, []);

    return (
        <div>
            <h1
                className="text-center"
                style={{
                    marginBottom: '20px',
                }}
            >
                Общая информация
            </h1>

            <Alert />

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Показатель</th>
                        <th>Значение</th>
                    </tr>
                </thead>
                <tbody>
                    {generalInfo.map((info) =>
                        info ? (
                            <tr key={info.name}>
                                <td>{info.name}</td>
                                <td>{info.value}</td>
                            </tr>
                        ) : (
                            ''
                        ),
                    )}
                </tbody>
            </Table>
        </div>
    );
};
