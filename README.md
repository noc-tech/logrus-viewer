# Logrus Viewer

A tool to view Logrus log entries with simple, filterable UI.

## Installation

You can install Logrus Viewer via `go get` and run.

```
$ go get -u github.com/noc-tech/logrus-viewer
$ logrus-viewer
```

## How to push logs to viewer
You must add logrus.Hook to push logs to viewer.

```
   package main

   import (
      //***
      "github.com/noc-tech/logrus-viewer/hook"
      //***
   )

   func initLogger() {
      //***
  		logrus.AddHook(hook.New())
      //***
   }
```

## License

MIT License

Copyright (c) 2021 NOC Tech
