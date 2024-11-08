import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircle,
  faCircleDot,
  faPlus,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";
import { type Plan } from "~/server/api/routers/events";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "~/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";

type ComponentProps = {
  planSteps: Plan[];
  currentPlanStep: number;
  projectId: number;
  issueNumber: number;
};

const newPlanStepSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  filePath: z.string().min(1, "File path is required"),
  exitCriteria: z.string().min(1, "Exit criteria is required"),
  dependencies: z.string().optional(),
});

export const PlanComponent: React.FC<ComponentProps> = ({
  planSteps,
  currentPlanStep,
  projectId,
  issueNumber,
}) => {
  const [feedback, setFeedback] = useState("");
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const utils = api.useContext();

  const form = useForm<z.infer<typeof newPlanStepSchema>>({
    resolver: zodResolver(newPlanStepSchema),
    defaultValues: {
      title: "",
      instructions: "",
      filePath: "",
      exitCriteria: "",
      dependencies: "",
    },
  });

  const createPlanStepMutation = api.planSteps.createPlanStep.useMutation({
    onSuccess: () => {
      utils.planSteps.getByProjectAndIssue.invalidate({
        projectId,
        issueNumber,
      });
      toast.success("New plan step added successfully");
      setIsAddStepDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to add new plan step: ${error.message}`);
    },
  });

  const regeneratePlanMutation = api.planSteps.regeneratePlan.useMutation({
    onSuccess: () => {
      utils.planSteps.getByProjectAndIssue.invalidate({
        projectId,
        issueNumber,
      });
      toast.success("Plan regenerated successfully");
      setFeedback("");
    },
    onError: (error) => {
      toast.error(`Failed to regenerate plan: ${error.message}`);
    },
  });

  const handleRedoPlan = () => {
    regeneratePlanMutation.mutate({ projectId, issueNumber, feedback });
  };

  const onSubmitNewPlanStep = (values: z.infer<typeof newPlanStepSchema>) => {
    createPlanStepMutation.mutate({
      ...values,
      projectId,
      issueNumber,
    });
  };

  return (
    <div className="w-full bg-blueGray-900 p-2 pt-0 text-gray-100">
      <h2 className="border-b border-blueGray-700 py-2 text-lg font-semibold">
        Plan
      </h2>
      <div className="mb-4 mt-2">
        <Textarea
          placeholder="Provide feedback on the current plan..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full bg-blueGray-800 text-gray-100"
        />
        <div className="mt-2 flex justify-between">
          <Button
            onClick={handleRedoPlan}
            disabled={regeneratePlanMutation.isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <FontAwesomeIcon icon={faRedo} className="mr-2" />
            Redo Plan
          </Button>
          <Dialog
            open={isAddStepDialogOpen}
            onOpenChange={setIsAddStepDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-light-blue hover:bg-blue-600">
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add Plan Step
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-blueGray-800 text-gray-100">
              <DialogHeader>
                <DialogTitle>Add New Plan Step</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitNewPlanStep)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-blueGray-700 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="bg-blueGray-700 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="filePath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Path</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-blueGray-700 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exitCriteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exit Criteria</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-blueGray-700 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dependencies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dependencies (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-blueGray-700 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="bg-light-blue hover:bg-blue-600"
                  >
                    Add Step
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid w-full grid-cols-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
        {planSteps.map((plan, idx) => {
          const isCurrentStep = !plan.isComplete && idx === currentPlanStep;
          return (
            <div
              key={plan.id}
              className={`relative max-w-sm transform rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 ${
                idx === currentPlanStep
                  ? "bg-blueGray-700 ring-2 ring-light-blue ring-opacity-50"
                  : "bg-blueGray-800"
              } ${plan.isComplete ? "opacity-70" : "opacity-100"}`}
            >
              <header
                className={`flex items-center justify-between text-white`}
              >
                <h3
                  className={`font-semibold ${isCurrentStep ? "text-orange-400" : ""} ${plan.isComplete && !isCurrentStep ? "line-through opacity-60" : ""}`}
                >
                  {idx + 1}. {plan.title}
                </h3>
                <FontAwesomeIcon
                  icon={
                    isCurrentStep
                      ? faCircle
                      : plan.isComplete
                        ? faCheckCircle
                        : faCircleDot
                  }
                  className={`h-3 w-3 text-xl ${isCurrentStep ? "animate-pulse text-orange" : plan.isComplete ? "text-light-blue" : "rounded-full border-2 border-blueGray-500 text-transparent"}`}
                />
              </header>
              <div className="mt-2 text-gray-300">
                <p>{plan.instructions}</p>
              </div>
              {isCurrentStep && (
                <div className="absolute inset-0 animate-pulse rounded-lg bg-light-blue bg-opacity-10"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanComponent;
