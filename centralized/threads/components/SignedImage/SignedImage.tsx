"use client";
import { useAsync } from "react-use";
import SigVerify from "../SigVerify/SigVerify";
import { useInView } from "react-intersection-observer";
import dynamic from "next/dynamic";
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

const USERLESS_SCHEMA_NAME = "userless:";

function SignedImageComponent(
  props: React.ImgHTMLAttributes<HTMLImageElement>,
) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    delay: 500,
  });

  const imgData = useAsync(async () => {
    if (!inView) {
      return;
    }
    const srcUrl = new URL(props.src as string);
    if (!srcUrl.protocol.includes(USERLESS_SCHEMA_NAME)) {
      return;
    }

    const u = new URL(window.location.href);
    u.pathname = "/resolve";
    u.searchParams.set("u", props.src as string);

    const resolveResp = await fetch(u.toString(), {
      cache: "force-cache",
    });

    const url = await resolveResp.text();
    if (!url) {
      throw resolveResp.statusText;
    }

    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      throw await imgResp.text();
    }

    const blob = await imgResp.blob();
    const buff = await blob.arrayBuffer();
    const dataurl = URL.createObjectURL(blob);
    return { blob, buff, dataurl };
  }, [props, inView]);

  const srcUrl = new URL(props.src as string);

  let component;

  if (srcUrl.protocol === USERLESS_SCHEMA_NAME) {
    if (imgData.value) {
      component = (
        <>
          <img {...props} src={imgData.value.dataurl} />
          <span className="text-xs">
            <SigVerify detatched content={imgData.value.buff} />
          </span>
        </>
      );
    } else if (imgData.error) {
      component = (
        <strong className="text-red-700">Error: {imgData.error.message}</strong>
      );
    } else {
      component = <i>resolving ${props.src}...</i>;
    }
  } else {
    component = <img {...props} />;
  }

  return <div ref={ref}>{component}</div>;
}

export const SignedImage = dynamic(
  () => Promise.resolve(SignedImageComponent),
  {
    ssr: false,
  },
);
