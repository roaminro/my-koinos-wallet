import { useToast, Textarea, Box, Button, Card, CardBody, CardFooter, Divider, Heading, Stack, FormControl, FormHelperText, FormLabel, Input, FormErrorMessage, Checkbox, Tag, TagCloseButton, TagLabel, TagLeftIcon, Skeleton, CardHeader } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { ChangeEvent, useEffect, useState } from 'react'
import { AddIcon, MinusIcon } from '@chakra-ui/icons'

import { HDKoinos } from '../util/HDKoinos'
import Nav from '../components/Nav'
import { isAlphanumeric, equalArray } from '../util/Utils'
import { useWallets } from '../context/WalletsProvider'

interface WalletCreateProps {
  importingSecretRecoveryPhrase?: boolean
}

export default function WalletCreator({ importingSecretRecoveryPhrase = false }: WalletCreateProps) {
  const router = useRouter()
  const toast = useToast()
  const { addWallet, addAccount, saveVault } = useWallets()

  const [walletName, setWalletName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [secretRecoveryPhrase, setSecretRecoveryPhrase] = useState('')
  const [isSecretRecoveryPhraseSaved, setIsSecretRecoveryPhraseSaved] = useState(false)
  const [secretRecoveryPhraseConfirmation, setSecretRecoveryPhraseConfirmation] = useState<string[]>([])
  const [randomizedSecretRecoveryPhraseWords, setRandomizedSecretRecoveryPhraseWords] = useState<string[]>([])
  const [secretRecoveryPhraseWords, setSecretRecoveryPhraseWords] = useState<string[]>([])
  const [isCreatingWallet, setIsCreatingWallet] = useState(false)

  useEffect(() => {
    if (!importingSecretRecoveryPhrase) {
      const secretRecoveryPhrase = HDKoinos.randomMnemonic()
      setSecretRecoveryPhrase(secretRecoveryPhrase)
      setSecretRecoveryPhraseWords(secretRecoveryPhrase.split(' '))
      setRandomizedSecretRecoveryPhraseWords(secretRecoveryPhrase.split(' ').sort(() => Math.random() - 0.5))
      setSecretRecoveryPhraseConfirmation([])
    }

  }, [importingSecretRecoveryPhrase])

  const handleSecretRecoveryPhraseChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSecretRecoveryPhrase(e.target.value)
  }

  const handleWalletNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWalletName(e.target.value)
  }

  const handleAccountNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountName(e.target.value)
  }

  const handleSavedSecretRecoveryPhraseChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSecretRecoveryPhraseSaved(e.target.checked)
    setRandomizedSecretRecoveryPhraseWords(secretRecoveryPhrase.split(' ').sort(() => Math.random() - 0.5))
    setSecretRecoveryPhraseConfirmation([])
  }

  const onAvailableSecretWordClick = (wordIndex: number) => {
    setSecretRecoveryPhraseConfirmation([...secretRecoveryPhraseConfirmation, randomizedSecretRecoveryPhraseWords[wordIndex]])
    setRandomizedSecretRecoveryPhraseWords(randomizedSecretRecoveryPhraseWords.filter((_, index) => index !== wordIndex))
  }

  const onSecretWordConfirmationClick = (wordIndex: number) => {
    setRandomizedSecretRecoveryPhraseWords([...randomizedSecretRecoveryPhraseWords, secretRecoveryPhraseConfirmation[wordIndex]])
    setSecretRecoveryPhraseConfirmation(secretRecoveryPhraseConfirmation.filter((_, index) => index !== wordIndex))
  }

  const createWallet = async () => {
    setIsCreatingWallet(true)

    try {
      const newWallet = await addWallet(walletName, secretRecoveryPhrase)
      await addAccount(newWallet.index, accountName)
      await saveVault()

      setSecretRecoveryPhrase('')
      setSecretRecoveryPhraseWords([])
      setRandomizedSecretRecoveryPhraseWords([])

      toast({
        title: 'Wallet successfully created',
        description: 'Your wallet was successfully created!',
        status: 'success',
        isClosable: true,
      })

      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      toast({
        title: 'An error occured while creating the wallet',
        description: (error as Error).message,
        status: 'error',
        isClosable: true,
      })
    } finally {
      setIsCreatingWallet(false)
    }
  }

  const isWalletNameInvalid = walletName.length < 1 || !isAlphanumeric(walletName)
  const isAccountNameInvalid = accountName.length < 1 || !isAlphanumeric(accountName)
  // if we are importing a seed phrase, then just check the number of words entered
  const isSecretRecoveryPhraseConfirmed = importingSecretRecoveryPhrase ? secretRecoveryPhrase.split(' ').length === 12 : equalArray(secretRecoveryPhraseWords, secretRecoveryPhraseConfirmation)

  let isCreateImportButtonDisabled = true

  if (importingSecretRecoveryPhrase) {
    isCreateImportButtonDisabled =
      isWalletNameInvalid
      || isAccountNameInvalid
      || !isSecretRecoveryPhraseConfirmed
  } else {
    isCreateImportButtonDisabled =
      isWalletNameInvalid
      || isAccountNameInvalid
      || !isSecretRecoveryPhraseSaved
      || !isSecretRecoveryPhraseConfirmed
  }

  return (
    <>
      <Nav />
      <Box padding={{ base: 4, md: 8 }} margin='auto' maxWidth='1024px'>
        <Stack mt='6' spacing='3' align='center'>
          <Card maxW='sm'>
            <CardHeader>
              <Heading size='md'>
                {
                  importingSecretRecoveryPhrase ? 'Import a wallet' : 'Create a new wallet'
                }
              </Heading>
            </CardHeader>
            <Divider />
            <CardBody>
              <Stack mt='6' spacing='3'>
                <FormControl isRequired isInvalid={isWalletNameInvalid}>
                  <FormLabel>Wallet Name</FormLabel>
                  <Input value={walletName} onChange={handleWalletNameChange} />
                  <FormHelperText>The wallet name is an easy way for you to identify a wallet.</FormHelperText>
                  {
                    isWalletNameInvalid && <FormErrorMessage>The wallet name must be at least 1 character and can only composed of the following characters (_-[0-9][a-z][A-Z]).</FormErrorMessage>
                  }
                </FormControl>
                <FormControl isRequired isInvalid={isAccountNameInvalid}>
                  <FormLabel>Account Name</FormLabel>
                  <Input value={accountName} onChange={handleAccountNameChange} />
                  <FormHelperText>The account name is an easy way for you to identify an account.</FormHelperText>
                  {
                    isAccountNameInvalid && <FormErrorMessage>The account name must be at least 1 character and can only composed of the following characters (_-[0-9][a-z][A-Z]).</FormErrorMessage>
                  }
                </FormControl>
                {
                  !importingSecretRecoveryPhrase &&
                  <>
                    <FormControl hidden={isSecretRecoveryPhraseSaved}>
                      <FormLabel>Secret Phrase</FormLabel>
                      <Textarea value={secretRecoveryPhrase} readOnly={true} />
                      <FormHelperText>The &quot;Secret Phrase&quot; is the &quot;Master Key&quot; that allows you to recover your accounts. You MUST keep it in a safe place as losing it will result in a loss of the funds.</FormHelperText>
                    </FormControl>
                    <FormControl isRequired>
                      <Checkbox isChecked={isSecretRecoveryPhraseSaved} onChange={handleSavedSecretRecoveryPhraseChange}>I confirm that I saved the &quot;Secret Phrase&quot; in a safe place.</Checkbox>
                    </FormControl>
                    <FormControl isRequired hidden={!isSecretRecoveryPhraseSaved} isInvalid={!isSecretRecoveryPhraseConfirmed}>
                      <FormLabel>Secret Phrase Confirmation</FormLabel>
                      {
                        secretRecoveryPhraseConfirmation.map((word, index) => {
                          if (index === secretRecoveryPhraseConfirmation.length - 1) {
                            return <Tag
                              margin={1}
                              cursor={'pointer'}
                              size='md'
                              key={index}
                              colorScheme='green'
                              onClick={() => onSecretWordConfirmationClick(index)}
                            >
                              <TagLeftIcon boxSize='12px' as={MinusIcon} />
                              <TagLabel>{word}</TagLabel>
                            </Tag>
                          } else {
                            return <Tag
                              margin={1}
                              size='md'
                              key={index}
                              colorScheme='green'
                            >
                              <TagLabel>{word}</TagLabel>
                            </Tag>
                          }
                        })
                      }
                      <Divider />
                      Secret Words available:
                      {
                        randomizedSecretRecoveryPhraseWords.map((word, index) => {
                          return <Tag
                            margin={1}
                            cursor={'pointer'}
                            size='md'
                            key={index}
                            colorScheme='blue'
                            onClick={() => onAvailableSecretWordClick(index)}
                          >
                            <TagLeftIcon boxSize='12px' as={AddIcon} />
                            <TagLabel>{word}</TagLabel>
                          </Tag>
                        })
                      }
                      <FormHelperText>Select the 12 words composing your &quot;Secret Phrase&quot; in the correct order.</FormHelperText>
                      {
                        !isSecretRecoveryPhraseConfirmed && <FormErrorMessage>The &quot;Secret Phrase&quot; confirmation is different than the &quot;Secret Phrase&quot;.</FormErrorMessage>
                      }
                    </FormControl>
                  </>
                }
                {
                  importingSecretRecoveryPhrase &&
                  <>
                    <FormControl isInvalid={!isSecretRecoveryPhraseConfirmed} isRequired>
                      <FormLabel>Secret Phrase</FormLabel>
                      <Textarea value={secretRecoveryPhrase} onChange={handleSecretRecoveryPhraseChange} />
                      <FormHelperText>Type the 12 words composing your &quot;Secret Phrase&quot;, separated by blank spaces.</FormHelperText>
                      {
                        !isSecretRecoveryPhraseConfirmed && <FormErrorMessage>The &quot;Secret Phrase&quot; should be composed of 12 words.</FormErrorMessage>
                      }
                    </FormControl>
                  </>
                }
              </Stack>
            </CardBody>
            <Divider />
            <CardFooter>
              <Button disabled={isCreatingWallet || isCreateImportButtonDisabled} isLoading={isCreatingWallet} variant='solid' colorScheme='green' onClick={createWallet}>
                {
                  importingSecretRecoveryPhrase ? 'Import wallet' : 'Create wallet'
                }
              </Button>
            </CardFooter>
          </Card>
        </Stack>
      </Box>
    </>
  )
}
