"use client";
import { Suspense, useEffect } from "react";
import ActionButton from "./ActionButton";
import { createStateContext, useList } from "react-use";
import { ReplyList } from "./ReplyList";

export type InfiniteScrollProps = {
  replyTo: string;
  start: number;
  init?: number;
};

const [useReplyHashes, ReplyHashesProvider] = createStateContext<Set<string>>(
  new Set(),
);

const [useLoading, LoadingProvider] = createStateContext(false);

export function ReplyHashNotifier(props: { hash: string }) {
  const setReplyHashes = useReplyHashes()[1];

  useEffect(() => {
    setReplyHashes((prev) => {
      const s = new Set(prev);
      s.add(props.hash);
      return s;
    });

    return () => {
      setReplyHashes((prev) => {
        const s = new Set(prev);
        s.delete(props.hash);
        return s;
      });
    };
  }, [props.hash]);

  return <></>;
}

function LoadingWheel() {
  const setLoading = useLoading()[1];

  useEffect(() => {
    setLoading(true);
    return () => {
      setLoading(false);
    };
  }, []);

  return (
    <>
      <p>Loading...</p>
    </>
  );
}

function InfiniteScrollComponent(props: InfiniteScrollProps) {
  const [repliesStarts, { push }] = useList<number>(
    props.init ? [props.init] : [],
  );
  const replyCount = useReplyHashes()[0].size;
  const loading = useLoading()[0];

  const next = () => {
    if (!loading) {
      push(replyCount + (props.init ?? 0));
    }
  };

  return (
    <>
      {repliesStarts.map((start) => (
        <Suspense fallback={<LoadingWheel />}>
          <ReplyList replyTo={props.replyTo} start={start} />
        </Suspense>
      ))}

      <span className="text-sm">
        <ActionButton
          label={loading ? "Loading More..." : "More"}
          onClick={next}
        />
      </span>
    </>
  );
}

export function InfiniteScroll(props: InfiniteScrollProps) {
  return (
    <ReplyHashesProvider>
      <LoadingProvider>
        <InfiniteScrollComponent {...props} />
      </LoadingProvider>
    </ReplyHashesProvider>
  );
}
