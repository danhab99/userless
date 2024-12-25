package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
)

func InspectPolicy(content []byte, commandStr, webhook string, mode SecurityConfigMode, policy interface{}, basicMode func() error) error {
	switch mode {
	case BasicMode:
		return basicMode()
	case ShellMode:
		cmd := exec.Command("sh", "-c", commandStr)
		stdin, err := cmd.StdinPipe()
		if err != nil {
			panic(err)
		}

		_, err = stdin.Write(content)
		if err != nil {
			return err
		}

		err = cmd.Run()
		if err != nil {
			return fmt.Errorf("verification failed %+v", err)
		}

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return err
		}

		err = json.NewDecoder(stdout).Decode(&policy)
		if err != nil {
			return err
		}
		break
	case HttpMode:
		req, err := http.NewRequest("POST", webhook, bytes.NewBuffer(content))
		if err != nil {
			return err
		}

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}

		if res.StatusCode == 200 {
			err := json.NewDecoder(res.Body).Decode(&policy)
			if err != nil {
				return err
			}
		} else {
			return fmt.Errorf("rejected thread")
		}
		break
	}

	return nil
}
