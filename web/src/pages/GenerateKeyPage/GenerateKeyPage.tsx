import {
  CheckboxField,
  Form,
  InputField,
  Label,
  Submit,
  TextAreaField,
} from '@redwoodjs/forms'
import { Metadata } from '@redwoodjs/web'
import { useCallback } from 'react'
import * as openpgp from 'openpgp'
import { useAddPrivateKey } from 'src/components/KeyContext'

const GenerateKeyPage = () => {
  type MyFieldVals = {
    name: string
    email: string
    comment: string
    password: string
  }

  const addKey = useAddPrivateKey()

  const handleGenerate = useCallback(async (f: MyFieldVals) => {
    const sk = await openpgp.generateKey({
      userIDs: [
        {
          comment: f.comment,
          email: f.email,
          name: f.name,
        },
      ],
      passphrase: f.password,
    })

    const skp = await openpgp.readPrivateKey({
      armoredKey: sk.privateKey,
    })

    addKey(skp)
  }, [])

  return (
    <>
      <Metadata title="GenerateKey" description="GenerateKey page" />
      <h1>Generate Keys</h1>

      <div className="flex flex-row justify-center pt-40">
        <Form
          className="card p-4 text-right bg-white"
          onSubmit={handleGenerate}
        >
          <div className="grid grid-cols-2 gap-2">
            <Label name="name">Name:</Label>
            <InputField name="name" type="text" required />

            <Label name="email">Email:</Label>
            <InputField name="email" type="email" required />

            <Label name="password">Password:</Label>
            <InputField name="password" type="password" required />

            <Label name="email">Auto register:</Label>
            <div className="text-left">
              <CheckboxField name="autoregister" />
            </div>
          </div>

          <div>
            <Label name="comment">Bio (comment):</Label>
          </div>
          <TextAreaField name="comment" className="w-full" />

          <Submit className="w-full">
            <button className="w-full rounded bg-red-400 p-2 text-white">
              Generate
            </button>
          </Submit>
        </Form>
      </div>
    </>
  )
}

export default GenerateKeyPage
