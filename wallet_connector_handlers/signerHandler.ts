import { Provider, Signer } from 'koilib'
import { SendTransactionOptions, TransactionJson, TransactionReceipt } from 'koilib/lib/interface'
import { IncomingMessage, OutgoingMessage } from '../pages/embed/wallet-connector'
import { SIGN_HASH_PARENT_ID, SIGN_MESSAGE_PARENT_ID, SIGN_SEND_TRANSACTION_PARENT_ID } from '../util/Constants'
import { Messenger, SendDataFn, SendErrorFn } from '../util/Messenger'
import { getErrorMessage } from '../util/Utils'

export interface SignSendTransactionArguments {
  requester: string
  signerAddress: string
  send: boolean
  transaction: TransactionJson
  options: SendTransactionOptions
}

export interface SignSendTransactionResult {
  receipt?: TransactionReceipt
  transaction: TransactionJson
}

export interface PrepareTransactionArguments {
  signerAddress: string
  transaction: TransactionJson
}

export interface PrepareTransactionResult {
  transaction: TransactionJson
}

export interface SignMessageArguments {
  requester: string
  signerAddress: string
  message: string
}

export interface SignHashArguments {
  requester: string
  signerAddress: string
  hash: string
}

export const handler = (sender: string, data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn, provider: Provider) => {
  switch (data.command) {
    case 'signTransaction': {
      return signSendTransaction(false, sender, data, sendData, sendError)
    }

    case 'signAndSendTransaction': {
      return signSendTransaction(true, sender, data, sendData, sendError)
    }

    case 'signMessage': {
      return signMessage(sender, data, sendData, sendError)
    }

    case 'signHash': {
      return signHash(sender, data, sendData, sendError)
    }

    case 'prepareTransaction': {
      return prepareTransaction(data, sendData, sendError, provider)
    }

    default:
      sendError('command not supported')
      break
  }
}

const prepareTransaction = async (data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn, provider: Provider) => {
  try {
    const { signerAddress, transaction } = JSON.parse(data.arguments!) as PrepareTransactionArguments

    if (!signerAddress) {
      throw new Error('missing "signerAddress" argument')
    }

    if (!transaction) {
      throw new Error('missing "transaction" argument')
    }

    const dummySigner = Signer.fromSeed('dummy_signer')
    dummySigner.provider = provider

    if (!transaction.header) {
      transaction.header = {}
    }

    if (!transaction.header?.payer) {
      transaction.header.payer = signerAddress
    }

    sendData({ result: await dummySigner.prepareTransaction(transaction) })
  } catch (error) {
    sendError(getErrorMessage(error))
  }
}

const signSendTransaction = (send: boolean, requester: string, data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn) => {
  const args = JSON.parse(data.arguments!) as SignSendTransactionArguments

  if (!args.signerAddress) {
    sendError('missing "signerAddress" argument')
    return
  }

  if (!args.transaction) {
    sendError('missing "transaction" argument')
    return
  }

  return new Promise<void>((resolve) => {
    const params = 'popup=yes,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=450,height=550'
    const newWindow = window.open('/embed/signSendTransaction', 'Transaction', params)!
    const popupMsgr = new Messenger<SignSendTransactionResult, SignSendTransactionArguments>(newWindow, SIGN_SEND_TRANSACTION_PARENT_ID, true, window.location.origin)

    newWindow.onload = () => {
      newWindow.onunload = () => {
        popupMsgr.removeListener()
        sendError('request was cancelled')
        resolve()
      }
    }

    try {
      popupMsgr.onMessage(({ data }) => {
        sendData({ result: data })
        popupMsgr.removeListener()
        newWindow.close()
        resolve()
      })

      popupMsgr.onRequest(({ sendData }) => {
        args.requester = requester
        args.send = send
        sendData(args)
      })
    } catch (error) {
      sendError(getErrorMessage(error))
      resolve()
    }

    newWindow.resizeTo(450, 550)

    newWindow.focus()
  })
}

const signMessage = (requester: string, data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn) => {
  const args = JSON.parse(data.arguments!) as SignMessageArguments

  if (!args.signerAddress) {
    sendError('missing "signerAddress" argument')
    return
  }

  if (!args.message) {
    sendError('missing "message" argument')
    return
  }

  return new Promise<void>((resolve) => {
    const params = 'popup=yes,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=450,height=550'
    const newWindow = window.open('/embed/signMessage', 'Message Signature', params)!
    const popupMsgr = new Messenger<string, SignMessageArguments>(newWindow, SIGN_MESSAGE_PARENT_ID, true, window.location.origin)

    newWindow.onload = () => {
      newWindow.onunload = () => {
        popupMsgr.removeListener()
        sendError('request was cancelled')
        resolve()
      }
    }

    try {
      popupMsgr.onMessage(({ data }) => {
        sendData({ result: data })
        popupMsgr.removeListener()
        newWindow.close()
        resolve()
      })

      popupMsgr.onRequest(({ sendData }) => {
        args.requester = requester
        sendData(args)
      })
    } catch (error) {
      sendError(getErrorMessage(error))
      resolve()
    }

    newWindow.resizeTo(450, 550)

    newWindow.focus()
  })
}

const signHash = (requester: string, data: IncomingMessage, sendData: SendDataFn<OutgoingMessage>, sendError: SendErrorFn) => {
  const args = JSON.parse(data.arguments!) as SignHashArguments

  if (!args.signerAddress) {
    sendError('missing "signerAddress" argument')
    return
  }

  if (!args.hash) {
    sendError('missing "hash" argument')
    return
  }

  return new Promise<void>((resolve) => {
    const params = 'popup=yes,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=450,height=550'
    const newWindow = window.open('/embed/signHash', 'Hash Signature', params)!
    const popupMsgr = new Messenger<string, SignHashArguments>(newWindow, SIGN_HASH_PARENT_ID, true, window.location.origin)

    newWindow.onload = () => {
      newWindow.onunload = () => {
        popupMsgr.removeListener()
        sendError('request was cancelled')
        resolve()
      }
    }

    try {
      popupMsgr.onMessage(({ data }) => {
        sendData({ result: data })
        popupMsgr.removeListener()
        newWindow.close()
        resolve()
      })

      popupMsgr.onRequest(({ sendData }) => {
        args.requester = requester
        sendData(args)
      })
    } catch (error) {
      sendError(getErrorMessage(error))
      resolve()
    }

    newWindow.resizeTo(450, 550)

    newWindow.focus()
  })
}