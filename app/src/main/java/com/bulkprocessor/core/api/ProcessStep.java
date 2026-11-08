package com.bulkprocessor.core.api;

/**
 * An individual step inside a processing pipeline.
 */
public interface ProcessStep<I, O> {
    String getStepName();
    int getOrder();
    StepResult<O> execute(RecordItem<I> record, JobContext context) throws StepExecutionException;
    default boolean shouldExecute(RecordItem<I> record, JobContext context) { return true; }
}

