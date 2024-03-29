import { useColorModeValue, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, FormControl, FormErrorMessage, FormHelperText, FormLabel, Input, NumberInput, NumberInputField, useToast, Tooltip, Stack, HStack, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react'
import { Contract, utils, Signer } from 'koilib'
import { ChangeEvent, useEffect, useState } from 'react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useNetworks } from '../context/NetworksProvider'
import { useWallets } from '../context/WalletsProvider'
import { TransactionJson } from 'koilib/lib/interface'
import { getErrorMessage, truncateAccount } from '../util/Utils'
import { useSWRConfig } from 'swr'
import { Token, useTokens } from '../context/TokensProvider'
import { useTokenBalance } from './BalanceUtils'
import { FiX } from 'react-icons/fi'
import { GroupBase, Select, SingleValue } from 'chakra-react-select'

import { useContacts } from '../context/ContactsProvider'

interface SendTokensModalProps {
  defaultTokenAddress?: string
  defaultRecipientAddress?: string
}

interface AccountOption {
  name: string
  address: string
}

// @ts-ignore adding optional "memo" field to transfer_arguments
utils.tokenAbi.koilib_types!.nested.koinos.nested.contracts.nested.token.nested.transfer_arguments.fields.memo = {
  'type': 'string',
  'id': 100
}

export default NiceModal.create(({ defaultTokenAddress, defaultRecipientAddress }: SendTokensModalProps) => {
  const modal = useModal()

  const toast = useToast()
  const { mutate } = useSWRConfig()

  const { wallets, selectedAccount, signTransaction } = useWallets()
  const { selectedNetwork, provider } = useNetworks()
  const { tokens } = useTokens()
  const { contacts } = useContacts()

  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [recipientAccount, setRecipientAccount] = useState<AccountOption | null>()

  const [availableTokens, setAvailableTokens] = useState<Token[]>()
  const [selectedToken, setSelectedToken] = useState<Token | null>()
  const [isSending, setIsSending] = useState(false)

  const [accountOptions, setAccountOptions] = useState<GroupBase<AccountOption>[]>([])


  const handleRecipientAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value.trim())
  }

  const handleMemoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMemo(e.target.value)
  }

  const handleAmountChange = (amount: string, _: number) => {
    setAmount(amount)
  }

  const clearAmount = () => {
    setAmount('')
  }

  const handleRecipientAccountChange = (newVal: SingleValue<AccountOption>) => {
    setRecipientAccount(newVal)
    if (newVal) {
      setRecipientAddress(newVal.address)
    }
  }

  const handleTokenChange = (newVal: SingleValue<Token>) => {
    setSelectedToken(newVal)
  }

  const clearRecipient = () => {
    setRecipientAddress('')
    setRecipientAccount(null)
  }

  useEffect(() => {
    if (tokens && selectedNetwork) {
      const tkns: Token[] = []

      const initialToken: Token = {
        chainId: selectedNetwork.chainId,
        name: selectedNetwork.tokenName,
        address: selectedNetwork.tokenAddress,
        symbol: selectedNetwork.tokenSymbol,
        decimals: selectedNetwork.tokenDecimals,
      }

      tkns.push(initialToken)

      if (initialToken.address === defaultTokenAddress) {
        setSelectedToken(initialToken)
      }

      for (const tokenAddress in tokens) {
        const token = tokens[tokenAddress]

        if (token.chainId === selectedNetwork.chainId) {
          tkns.push(token)
        }

        if (token.address === defaultTokenAddress) {
          setSelectedToken(token)
        }
      }

      setAvailableTokens(tkns)
    }

    const accOptions: GroupBase<AccountOption>[] = []

    Object.entries(wallets).map(([_, wallet]) => {
      const walletOption: { label: string, options: AccountOption[] } = {
        label: wallet.name,
        options: []
      }

      Object.entries(wallet.accounts).map(([__, account]) => {
        const { name, address } = account.public

        walletOption.options.push({
          name,
          address,
        })

        if (account.public.address === defaultRecipientAddress) {
          setRecipientAddress(defaultRecipientAddress)
          setRecipientAccount({
            name,
            address
          })
        }
      })

      accOptions.push(walletOption)
    })

    const contactsOption: { label: string, options: AccountOption[] } = {
      label: 'Contacts',
      options: []
    }

    Object.entries(contacts).map(([_, contact]) => {
      const { name, address } = contact
      contactsOption.options.push({
        name,
        address,
      })

      if (contact.address === defaultRecipientAddress) {
        setRecipientAddress(defaultRecipientAddress)
        setRecipientAccount({
          name,
          address,
        })
      }
    })

    accOptions.push(contactsOption)
    setAccountOptions(accOptions)

  }, [contacts, defaultRecipientAddress, defaultTokenAddress, selectedNetwork, tokens, wallets])

  const sendTokens = async () => {
    setIsSending(true)
    try {
      if (selectedAccount && selectedToken && selectedNetwork) {
        const formattedAmount = utils.parseUnits(amount, selectedToken.decimals)

        const dummySigner = Signer.fromSeed('dummy_signer')
        dummySigner.provider = provider

        const tokenContract = new Contract({
          id: selectedToken.address,
          abi: utils.tokenAbi,
          provider,
          signer: dummySigner
        })

        // generate transaction
        const { transaction } = await tokenContract.functions.transfer({
          from: selectedAccount.account.public.address,
          to: recipientAddress,
          value: formattedAmount,
          memo
        }, {
          payer: selectedAccount.account.public.address,
          chainId: selectedNetwork.chainId,
          signTransaction: false,
          sendTransaction: false,
          broadcast: false,
          sendAbis: false,
        })

        // sign transaction
        let signedTx = await signTransaction(selectedAccount.account.public.address!, transaction as TransactionJson)

        // submit transaction without broadcasting to estimate mana used
        const { receipt } = await provider!.sendTransaction(signedTx, false)

        // add 10% to estimated mana used
        signedTx.header!.rc_limit = (BigInt(receipt.rc_used) * BigInt(110) / BigInt(100)).toString()
        signedTx.signatures = []
        signedTx = await dummySigner.prepareTransaction(signedTx)

        // sign transaction with new header
        signedTx = await signTransaction(selectedAccount.account.public.address!, signedTx)

        // send transaction
        const sendResult = await provider?.sendTransaction(signedTx)

        await sendResult?.transaction.wait('byTransactionId', 60000)

        const cacheKey = `${selectedNetwork.chainId}_${selectedAccount?.account.public.address!}_history_undefined_10`
        mutate(cacheKey)

        clearAmount()

        toast({
          title: 'Tokens successfully sent',
          description: 'The tokens were successfully sent!',
          status: 'success',
          isClosable: true,
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'An error occured while sending the tokens',
        description: getErrorMessage(error),
        status: 'error',
        isClosable: true,
      })
    }
    setIsSending(false)
  }

  const { balance: tokenBalance } = useTokenBalance(selectedAccount?.account?.public.address, selectedToken?.address)

  let formattedBalance = tokenBalance && selectedToken ? utils.formatUnits(tokenBalance, selectedToken.decimals) : ''

  let isRecipientAddressInvalid = false

  try {
    isRecipientAddressInvalid = !utils.isChecksumAddress(recipientAddress)
  } catch (error) {
    isRecipientAddressInvalid = true
  }

  const canSendTokens = !isRecipientAddressInvalid && !!selectedToken && parseFloat(amount) > 0

  return (
    <Modal isOpen={modal.visible} onClose={modal.hide}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Send tokens</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack>
            <FormControl>
              <FormLabel>Token</FormLabel>
              <Select<Token>
                useBasicStyles
                options={availableTokens}
                getOptionLabel={(token: Token) => `${token.name} (${token.symbol})`}
                getOptionValue={(token: Token) => token.address}
                placeholder="Select the token to send..."
                closeMenuOnSelect={true}
                value={selectedToken}
                onChange={handleTokenChange}
              />
              <FormHelperText>Select the token to send.</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Sender</FormLabel>
              <Input value={selectedAccount?.account.public.address} isDisabled={true} isReadOnly={true} />
              <FormHelperText>The address of the sender.</FormHelperText>
            </FormControl>

            <FormControl isRequired isInvalid={isRecipientAddressInvalid}>
              <FormLabel>Recipient</FormLabel>
              <Select<AccountOption, false, GroupBase<AccountOption>>
                useBasicStyles
                selectedOptionStyle="check"
                isClearable
                options={accountOptions}
                placeholder="Select recipient from wallets accounts..."
                backspaceRemovesValue={true}
                closeMenuOnSelect={true}
                getOptionLabel={(accountOption: AccountOption) => `${accountOption.name} (${truncateAccount(accountOption.address)})`}
                getOptionValue={(accountOption: AccountOption) => accountOption.address}
                value={recipientAccount}
                onChange={handleRecipientAccountChange}
              />
              <InputGroup>
                <Input value={recipientAddress} onChange={handleRecipientAddressChange} />
                <InputRightElement zIndex='0'>
                  <Tooltip
                    label='clear recipient'
                    placement="bottom"
                    hasArrow
                  >
                    <IconButton variant='ghost' aria-label='clear recipient' icon={<FiX />} onClick={clearRecipient} />
                  </Tooltip>
                </InputRightElement>
              </InputGroup>
              <FormHelperText>The address of the recipient.</FormHelperText>
              {
                isRecipientAddressInvalid && <FormErrorMessage>The recipient address entered is invalid.</FormErrorMessage>
              }
            </FormControl>

            <FormControl>
              <FormLabel>Amount</FormLabel>
              <InputGroup>
                <NumberInput width='100%' min={0} precision={selectedToken?.decimals} value={amount} onChange={handleAmountChange}>
                  <NumberInputField />
                </NumberInput>
                <InputRightElement zIndex='0'>
                  <Tooltip
                    label='clear amount'
                    placement="bottom"
                    hasArrow
                  >
                    <IconButton variant='ghost' aria-label='clear amount' icon={<FiX />} onClick={clearAmount} />
                  </Tooltip>
                </InputRightElement>
              </InputGroup>
              <FormHelperText>
                <Text>Amount of tokens to send.</Text>
                <HStack justifyContent='space-between'>
                  <Tooltip
                    label='send max amount'
                    placement="bottom"
                    hasArrow
                  >
                    <Text
                      cursor='pointer'
                      color={useColorModeValue('blue.500', 'blue.200')}
                      onClick={() => setAmount(formattedBalance)}
                    >
                      Balance {formattedBalance}
                    </Text>
                  </Tooltip>
                  <Tooltip
                    label='send max amount'
                    placement="bottom"
                    hasArrow
                  >
                    <Button size='xs' onClick={() => setAmount(formattedBalance)}>MAX</Button>
                  </Tooltip>
                </HStack>
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>Memo (optional)</FormLabel>
              <Input value={memo} onChange={handleMemoChange}/>
              <FormHelperText>Add a memo for the recipient.</FormHelperText>
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter justifyContent='space-between'>
          <Button mr={3} onClick={modal.hide}>
            Cancel
          </Button>
          <Button isDisabled={!canSendTokens} isLoading={isSending} colorScheme='blue' onClick={sendTokens}>Send</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
})
