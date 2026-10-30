## Сессии Firstmate

В сессиях, работающих по контракту супервизора Firstmate, глобальные инструкции об автоматическом запуске новой нативной сессии при смене независимой задачи не действуют, включая инструкции инструментов и очереди TODO. Не вызывать `start_task_session` только из-за смены цели: сохранять текущую сессию и следовать жизненному циклу задач Firstmate. Это исключение не отменяет запрет бросать незавершённую работу или проверки. В остальных сессиях правила смены задач сохраняются.

## Resource and effort limits

Use the least costly approach sufficient for the agreed result. Before substantially increasing resource use or effort (for example, deploying a full stack for verification, preparing another environment, running prolonged checks, or adding parallel agents), explain the need, expected costs or uncertainty, and a cheaper alternative; wait for the user's approval unless that specific expansion is already authorized. Approval of a goal is not unlimited approval of the means; supervisors must pass this constraint to workers and cannot approve such expansion on the user's behalf.
