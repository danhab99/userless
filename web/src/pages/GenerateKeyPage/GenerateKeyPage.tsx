import {
  CheckboxField,
  Form,
  InputField,
  Label,
  Submit,
  TextAreaField,
} from '@redwoodjs/forms'
import { Metadata } from '@redwoodjs/web'

const GenerateKeyPage = () => {

  return (
    <>
      <Metadata title="GenerateKey" description="GenerateKey page" />
      <h1>Generate Keys</h1>

      <div className="flex flex-row justify-center pt-40">
        <Form className="border border-black bg-card p-4 text-right">
          <div className="grid grid-cols-2 gap-2">
            <Label name="name">Name:</Label>
            <InputField name="name" type="text" required />

            <Label name="email">Email:</Label>
            <InputField name="email" type="email" required />

            <Label name="email">Auto register:</Label>
            <div className='text-left'>
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
