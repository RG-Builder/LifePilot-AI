# API cURL examples

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write report","importance":8,"duration":60,"is_habit":false}'
```

```bash
curl http://localhost:3000/api/tasks
```

```bash
curl -X POST http://localhost:3000/api/tasks/1/toggle
```

```bash
curl http://localhost:3000/api/schedule
```
