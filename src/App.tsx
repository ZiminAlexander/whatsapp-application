import React, { Fragment, useEffect, useState } from 'react';
import './App.css';

function App() {

  const [idInstance, setIdInstance] = useState("");
  const [apiTokenInstance, setApiTokenInstance] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [telNumber, setTelNumber] = useState("");
  const [chatNumber, setChatNumber] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat]: [chat: Array<{ sender: string, message: string }>, setChat: Function] = useState([]);
  const [intervalID, setIntervalID]: [intervalID: NodeJS.Timer | undefined, setIntervalID: Function] = useState();

  //Добавить элемент в массив отображаемых сообщений
  const addMessageToChat = (sender: string, message: string) => {
    const newChat = chat.slice();
    newChat.push({
      sender: sender,
      message: message
    });
    setChat(newChat);
  }

  //Форматирование номера телефона
  const phoneFormat = (phoneNumber : string) => {
    return `+7(${phoneNumber.slice(1, 4)})-${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}-${phoneNumber.slice(9,11)}`;
  }

  //Отправить сообщение на номер телефона, указанный в чате
  const sendMessage = () => {
    const apiUrl = "https://api.green-api.com";
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
      "chatId": `${chatNumber}@c.us`,
      "message": message
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    fetch(`${apiUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, requestOptions)
      .then(response => response.json())
      .then(result => console.log(result))
      .catch(error => console.log('error', error));
  }

  //Получить уведомление с сервера, добавить при необходимости в чат, 
  // удалить, если уведомление есть, если нет - выйти
  const getMessage = () => {
    const apiUrl = "https://api.green-api.com";
    const requestOptions: RequestInit = {
      method: 'GET',
      redirect: 'follow'
    };

    fetch(`${apiUrl}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}`, requestOptions)
      .then(response => response.json())
      .then(result => {
        console.log(result);

        if (result !== null) {
          if ((result.body.senderData.chatId) && result.body.senderData.chatId === `${chatNumber}@c.us`) {
            addMessageToChat(chatNumber, result.body.messageData.textMessageData.textMessage)
          }
          deleteMessageOnServer(result.receiptId);
        } else {
          console.log("Входящих сообщений нет")
        }
      })
      .catch(error => console.log('get-error', error));
  }

  //Удалить уведомление и запросить следующее
  const deleteMessageOnServer = (receiptId: Number) => {
    const apiUrl = "https://api.green-api.com";
    const requestOptions: RequestInit = {
      method: 'DELETE',
      redirect: 'follow'
    };

    fetch(`${apiUrl}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`, requestOptions)
      .then(response => response.text())
      .then(result => (() => {
        console.log(result);
        getMessage();
      })())
      .catch(error => console.log('error', error));
  }

  //Отображаемый массив сообщений
  const chatMessages: React.ReactNode[] = [];

  if (chat.length > 0) {
    chatMessages.push(chat.map((element, index) => {
      return (
        <div key={index} className={'message-div' + ((element.sender === "Вы") ? " right-side-message" : " left-side-message")}>
          <div className="message-text-div">
            {element.message}
          </div>
        </div>
      );
    }));
  }

  //Проверять раз в 30 сек. новые уведомления, обновлять чат при его изменении
  useEffect(() => {
    if (chatNumber !== "") {
      if (!!intervalID) { clearInterval(intervalID) };
      const currentInterval = setInterval(() => getMessage(), 30000);
      setIntervalID(currentInterval);
    }
  }, [chatNumber, chat]);

  // Рендеринг приложения
  return (
    //Показать окно входа или чат
    <Fragment>
      {(!isLogin) ?
        <LoginWindow
          idInstance={idInstance}
          setIdInstance={setIdInstance}
          apiTokenInstance={apiTokenInstance}
          setApiTokenInstance={setApiTokenInstance}
          setIsLogin={setIsLogin}
        />
        : null
      }
      {(isLogin) ?
        <div className='app-window'>
          <div className='left-side'>
            <div className='border-input-div'>
              <input type='text' className='telephone-input'
                placeholder="Введите номер 79999999999 и нажмите Enter"
                onChange={(event) => setTelNumber(event.target.value)}
                value={telNumber}
                onKeyDown={(event) => ((event.code === "Enter") && (telNumber.length === 11)) ?
                  (() => {
                    if (chatNumber !== "") {setChat([])}
                    setChatNumber(telNumber);
                    setTelNumber("");
                  })()
                  : (event.code === "Enter") ? console.log("Номер должен содержать 11 цифр") : null} 
              />
            </div>
            {(chatNumber !== "") ?
              <div className='chat'>
                {phoneFormat(chatNumber)}
              </div>
              : null
            }
          </div>
          <div className='right-side'>
            {(chatNumber !== "") ?
              <div className='chat-field'>
                <div className='right-chat'>
                  {phoneFormat(chatNumber)}
                </div>
                <div className={'messages' + ((chatMessages.length <= 0) ? " no-messages" : "")}>
                  {(chatMessages.length > 0) ? chatMessages : "Сообщений нет"}
                </div>
                <input type='text' className='message-input'
                  placeholder="Введите сообщение и нажмите Enter"
                  onChange={(event) => setMessage(event.target.value)}
                  value={message}
                  onKeyDown={(event) => (event.code === "Enter") ?
                    (() => {
                      sendMessage();
                      addMessageToChat("Вы", message);
                      setMessage("");
                    })()
                    : null}
                />
              </div>
              :
              <div className='empty-message'>Отправляйте и получайте сообщения</div>
            }
          </div>
        </div>
        : null
      }
    </Fragment>
  );
}

//Окно для ввода idInstance и apiTokenInstance
const LoginWindow = ({ idInstance, setIdInstance, apiTokenInstance, setApiTokenInstance, setIsLogin }:
  { idInstance: string, setIdInstance: Function, apiTokenInstance: string, setApiTokenInstance: Function, setIsLogin: Function }) => {
  return (
    <div className='login-window'>
      <div className='idInstance-div'>
        <input type='text' className='input-login'
          onChange={(event) => setIdInstance(event.target.value)}
          value={idInstance}
          placeholder='Enter idInstance'
        />
      </div>
      <div className='apiTokenInstance-div'>
        <input type='text' className='input-login'
          onChange={(event) => setApiTokenInstance(event.target.value)}
          value={apiTokenInstance}
          placeholder='Enter apiTokenInstance'
        />
      </div>
      <button className='login-button' onClick={() => {
        if ((idInstance.length === 10) && (apiTokenInstance.length === 50)) { setIsLogin(true) } else { console.log("Неправильный формат данных") }
      }
      }>
        Войти в приложение
      </button>
    </div>
  );
}

export default App;