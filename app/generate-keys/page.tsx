"use client";
import * as openpgp from "openpgp";
import { useAddPrivateKey } from "@/components/KeyContext";
import { useForm } from "react-hook-form";
import { CenteredLayout } from "@/layouts/centered";

const GenerateKeyPage = () => {
  type MyFieldVals = {
    name: string;
    email: string;
    comment: string;
    password: string;
    autoregister: boolean;
  };

  const addKey = useAddPrivateKey();

  const { register, handleSubmit } = useForm<MyFieldVals>();

  const handleGenerate = handleSubmit(async (f) => {
    const sk = await openpgp.generateKey({
      userIDs: [
        {
          comment: f.comment,
          email: f.email,
          name: f.name,
        },
      ],
      passphrase: f.password,
    });

    const skp = await openpgp.readPrivateKey({
      armoredKey: sk.privateKey,
    });

    addKey(skp);

    if (f.autoregister) {
      const resp = await fetch("/api/register", {
        method: "POST",
        body: skp.toPublic().armor(),
      });

      if (resp.ok) {
        console.error("REGISTER ERROR", await resp.text());
        alert("couldn't register");
      }
    }
  });

  return (
    <>
      <CenteredLayout>
        <form
          className="card p-4 text-right bg-white"
          onSubmit={handleGenerate}
        >
          <h1 className="text-slate-800 text-center pb-2">Generate Keys</h1>
          <div className="grid grid-cols-2 gap-4">
            <label>Name:</label>
            <input type="text" required {...register("name")} />

            <label>Email:</label>
            <input type="email" {...register("email")} />

            <label>Password:</label>
            <input type="password" required {...register("password")} />

            <label>Auto register:</label>
            <input type="checkbox" {...register("autoregister")} />
          </div>

          <div className="py-2">
            <label>Bio (comment):</label>
            <textarea className="w-full" {...register("comment")} />
          </div>

          <input type="submit" className="w-full rounded bg-red-400 p-2" />
        </form>
      </CenteredLayout>
    </>
  );
};

export default GenerateKeyPage;
