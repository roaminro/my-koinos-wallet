import { useToast, Stack, Card, CardHeader, Heading, Divider, CardBody, FormControl, FormLabel, Input, FormHelperText, FormErrorMessage, Button, Checkbox, Center } from '@chakra-ui/react'
import { Signer, utils } from 'koilib'
import { useRouter } from 'next/router'
import { useState, ChangeEvent } from 'react'
import { BackButton } from '../../../../components/BackButton'
import { useWallets } from '../../../../context/WalletsProvider'
import { isAlphanumeric } from '../../../../util/Utils'

export default function Import() {
  const router = useRouter()
  const toast = useToast()

  const { importAccount, wallets, isLocked } = useWallets()

  const { walletId } = router.query

  const [accountName, setAccountName] = useState('')
  const [accountPrivateKey, setAccountPrivateKey] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [watchMode, setWatchMode] = useState(false)

  const handleAccountNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountName(e.target.value)
  }

  const handleAccountAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountAddress(e.target.value.trim())
  }

  const handleAccountPrivateKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()
    setAccountPrivateKey(trimmedValue)

    try {
      if (utils.isChecksumWif(trimmedValue)) {
        setAccountAddress(Signer.fromWif(trimmedValue).getAddress())
      } else {
        setAccountAddress('')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleWatchModeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWatchMode(e.target.checked)
  }

  const importAccountClick = async () => {
    setIsLoading(true)

    try {
      if (!walletId) {
        throw new Error('missing walletId')
      }

      await importAccount(walletId as string, accountName, accountAddress, accountPrivateKey)
      setAccountPrivateKey('')

      router.push('/home')

      toast({
        title: 'Account successfully imported',
        description: 'Your account was successfully imported!',
        status: 'success',
        isClosable: true,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'An error occured while importing the account',
        description: String(error),
        status: 'error',
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isAccountNameInvalid = accountName.length < 1 || !isAlphanumeric(accountName)

  let isAccountAddressInvalid = false

  try {
    isAccountAddressInvalid = watchMode && !utils.isChecksumAddress(accountAddress)
  } catch (error) {
    isAccountAddressInvalid = true
  }

  let isAccountPrivateKeyInvalid = false

  try {
    isAccountPrivateKeyInvalid = !watchMode && !utils.isChecksumWif(accountPrivateKey)
  } catch (error) {
    isAccountPrivateKeyInvalid = true
  }

  if (isLocked) return <></>

  return (
    <Center>
      <Card width='100%'>
        <CardHeader>
          <Stack spacing={8} direction='row'>
            <BackButton />
            <Heading size='md'>Import account to wallet &quot;{walletId && wallets[walletId as string].name}&quot;</Heading>
          </Stack>
        </CardHeader>
        <Divider />
        <CardBody>
          <Stack mt='6' spacing='3'>
            <FormControl isRequired isInvalid={isAccountNameInvalid}>
              <FormLabel>Account Name</FormLabel>
              <Input value={accountName} onChange={handleAccountNameChange} />
              <FormHelperText>The account name is an easy way for you to identify an account.</FormHelperText>
              {
                isAccountNameInvalid && <FormErrorMessage>The account name must be at least 1 character and can only composed of the following characters (_-[0-9][a-z][A-Z]).</FormErrorMessage>
              }
            </FormControl>
            <FormControl isRequired>
              <Checkbox isChecked={watchMode} onChange={handleWatchModeChange}>Import in Watch Mode (when checking this box you will not be able to sign transactions with this account).</Checkbox>
            </FormControl>
            {
              watchMode &&
              <FormControl isRequired isInvalid={isAccountAddressInvalid}>
                <FormLabel>Account Address</FormLabel>
                <Input value={accountAddress} onChange={handleAccountAddressChange} />
                <FormHelperText>The account&apos;s address to import in Watch Mode.</FormHelperText>
                {
                  isAccountAddressInvalid && <FormErrorMessage>The account address entered is invalid.</FormErrorMessage>
                }
              </FormControl>
            }
            {
              !watchMode &&
              <>
                <FormControl isRequired isInvalid={isAccountPrivateKeyInvalid}>
                  <FormLabel>Account Private Key (WIF format)</FormLabel>
                  <Input type='password' value={accountPrivateKey} onChange={handleAccountPrivateKeyChange} />
                  <FormHelperText>The account&apos;s private key your want to import in the WIF format.</FormHelperText>
                  {
                    isAccountPrivateKeyInvalid && <FormErrorMessage>The Private Key entered is invalid.</FormErrorMessage>
                  }
                </FormControl>
                <FormControl isReadOnly={true}>
                  <FormLabel>Account Address</FormLabel>
                  <Input value={accountAddress} />
                  <FormHelperText>The account&apos;s address associated with the above Private Key.</FormHelperText>
                </FormControl>
              </>
            }
            <Button
              disabled={isAccountNameInvalid || !walletId || isAccountPrivateKeyInvalid || isAccountAddressInvalid}
              isLoading={isLoading}
              variant='solid'
              colorScheme='green'
              onClick={importAccountClick}>
              Import Account
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Center>
  )
}