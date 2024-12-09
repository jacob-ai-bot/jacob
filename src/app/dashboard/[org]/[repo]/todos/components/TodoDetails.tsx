[Previous content remains unchanged until line 48]
  const { data: planSteps } = api.planSteps.getByProjectAndIssue.useQuery({
    projectId: selectedTodo.projectId,
    issueNumber: selectedTodo.issueId ?? 0,
  }); // Removed unused isLoading variable

[Rest of the file remains unchanged]

