import React, { useEffect, useState } from 'react';
import { Accordion, Card } from 'react-bootstrap';
import { firestore } from '../utils/firebase';
import { Form } from '../components/Form';
import { Alert } from '../components/Alert';

export const Settings = () => {
    const [globalSettings, setGlobalSettings] = useState([]);
    const [buySettings, setBuySettings] = useState([]);
    const [orderSettings, setOrderSettings] = useState([]);

    useEffect(() => {
        firestore
            .collection('global_settings')
            .orderBy('order')
            .onSnapshot((settings) => {
                const updatedSettings = [];

                settings.forEach((setting) => {
                    const settingData = setting.data();
                    const settingId = setting.id;

                    updatedSettings.push({ ...settingData, id: settingId });
                });

                setGlobalSettings(updatedSettings);
            });

        firestore
            .collection('buy_settings')
            .orderBy('order')
            .onSnapshot((settings) => {
                const updatedSettings = [];

                settings.forEach((setting) => {
                    const settingData = setting.data();
                    const settingId = setting.id;
                    if (setting.id !== 'minProfitBuy') {
                        updatedSettings.push({ ...settingData, id: settingId });
                    } else {
                        settingData.percents.forEach((percent, index) =>
                            updatedSettings.push({
                                description: `Минимальный профит ${percent.description}`,
                                value: percent.value,
                                id: `${settingId}_${index}`,
                            }),
                        );
                    }
                });

                setBuySettings(updatedSettings);
            });

        firestore
            .collection('order_settings')
            .orderBy('order')
            .onSnapshot((settings) => {
                const updatedSettings = [];

                settings.forEach((setting) => {
                    const settingData = setting.data();
                    const settingId = setting.id;

                    if (setting.id !== 'minProfitOrder') {
                        updatedSettings.push({ ...settingData, id: settingId });
                    } else {
                        settingData.percents.forEach((percent, index) =>
                            updatedSettings.push({
                                description: `Минимальный профит ${percent.description}`,
                                value: percent.value,
                                id: `${settingId}_${index}`,
                            }),
                        );
                    }
                });

                setOrderSettings(updatedSettings);
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
                Настройки
            </h1>

            <Alert />

            <Accordion defaultActiveKey="0" className="settings">
                <Card>
                    <Accordion.Toggle as={Card.Header} eventKey="0">
                        Общие настройки
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            {globalSettings.map((setting) => (
                                <Form
                                    setting={setting}
                                    collection="global_settings"
                                    key={`global_settings_${setting.id}`}
                                />
                            ))}
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
                <Card>
                    <Accordion.Toggle as={Card.Header} eventKey="1">
                        Настройки покупки
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="1">
                        <Card.Body>
                            {buySettings.map((setting) => (
                                <Form
                                    setting={setting}
                                    collection="buy_settings"
                                    key={`buy_settings_${setting.id}`}
                                />
                            ))}
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
                <Card>
                    <Accordion.Toggle as={Card.Header} eventKey="2">
                        Настройки заказов
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="2">
                        <Card.Body>
                            {orderSettings.map((setting) => (
                                <Form
                                    setting={setting}
                                    collection="order_settings"
                                    key={`order_settings_${setting.id}`}
                                />
                            ))}
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            </Accordion>
        </div>
    );
};
