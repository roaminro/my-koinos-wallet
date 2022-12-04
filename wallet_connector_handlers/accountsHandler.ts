import { IncomingMessage, OutgoingMessage } from '../pages/embed/wallet-connector'
import { Messenger, SendDataFn, SendErrorFn } from '../util/Messenger'

export interface IAccount {
  address: string
  signers: {
    address: string,
  }[]
}

export const handler = (sender: string, data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn) => {
  switch (data.command) {
    case 'getAccounts': {
      return getAccounts(sender, data, sendData, sendError)
    }

    default:
      sendError('command not supported')
      break
  }
}

const getAccounts = (sender: string, _: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn) => {
  return new Promise<void>((resolve) => {
    const params = 'popup=yes,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=400,height=500'
    const newWindow = window.open('/embed/accounts', 'Accounts', params)!
    newWindow.resizeTo(400, 500)

    newWindow.onload = async () => {  //wait til load to add onunload event
      try {
        const popupMsgr = new Messenger<IAccount[], string>(newWindow, 'accounts-popup-parent', true, window.location.origin)
        newWindow.onunload = () => {
          popupMsgr.removeListener()
          sendError('request was cancelled')
          resolve()
        }

        popupMsgr.onMessage(({ data: accounts }) => {
          sendData({ result: accounts })
          popupMsgr.removeListener()
          newWindow.close()
          resolve()
        })

        popupMsgr.onRequest(({ sendData }) => {
          sendData(sender)
        })
      } catch (error) {
        sendError('request was cancelled')
        resolve()
      }
    }

    newWindow.focus()
  })
}