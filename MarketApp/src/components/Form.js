import React, { useContext, useState } from 'react';
import { firestore } from '../utils/firebase';
import { AlertContext } from '../context/alert/alertContext';

export const Form = ({ collection, setting }) => {
    const alert = useContext(AlertContext);
    const [value, setValue] = useState(Number(setting.value));

    const updateValue = () => {
        firestore
            .collection(collection)
            .doc(setting.id)
            .update({
                value,
            })
            .then((_) => alert.show('Успешно обновлено', 'success'))
            .catch((_) => alert.show('Не удалось обновить', 'danger'));
    };

    return (
        <div>
            <label
                htmlFor={`input_${collection}_${setting.id}`}
                className="col-sm-12 col-form-label"
            >
                {setting.description}
            </label>
            <div className="input-group col-sm-12">
                <input
                    type="number"
                    className="form-control"
                    id={`input_${collection}_${setting.id}`}
                    value={value}
                    onChange={(event) => setValue(Number(event.target.value))}
                />
                <button className="btn btn-outline-success" type="button" onClick={updateValue}>
                    Обновить
                </button>
            </div>
        </div>
    );
};
