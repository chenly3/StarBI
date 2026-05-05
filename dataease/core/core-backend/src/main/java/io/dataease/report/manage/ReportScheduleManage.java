package io.dataease.report.manage;

import io.dataease.job.schedule.ScheduleManager;
import io.dataease.report.dao.auto.entity.ReportTask;
import io.dataease.report.dao.auto.mapper.ReportTaskMapper;
import io.dataease.utils.LogUtil;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.quartz.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

/**
 * <p>
 * 报告调度管理器
 * </p>
 *
 * @author fit2cloud
 * @since 2026-05-05
 */
@Component
@Transactional(rollbackFor = Exception.class)
public class ReportScheduleManage {

    @Resource
    private ScheduleManager scheduleManager;

    @Resource
    private ReportTaskMapper reportTaskMapper;

    private static final String JOB_GROUP = "report_task_group";
    private static final String TRIGGER_GROUP = "report_trigger_group";
    private static final String FIRE_TRIGGER_GROUP = "report_fire_group";

    /**
     * 添加调度任务
     *
     * @param task 任务
     */
    public void addJob(ReportTask task) {
        Long taskId = task.getId();
        String cronExpression = buildCronExpression(task);

        JobKey jobKey = JobKey.jobKey("report_" + taskId, JOB_GROUP);
        TriggerKey triggerKey = TriggerKey.triggerKey("report_" + taskId, TRIGGER_GROUP);

        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("taskId", taskId);
        jobDataMap.put("datasetTableId", task.getRid());
        jobDataMap.put("expression", cronExpression);
        jobDataMap.put("updateType", "report");

        try {
            Date startTime = task.getStartTime() != null ? new Date(task.getStartTime()) : null;
            Date endTime = task.getEndTime() != null ? new Date(task.getEndTime()) : null;

            scheduleManager.addOrUpdateCronJob(jobKey, triggerKey,
                    io.dataease.report.job.ReportExecuteJob.class,
                    cronExpression, startTime, endTime, jobDataMap);

            LogUtil.info("Report job added: " + taskId + ", cron: " + cronExpression);
        } catch (Exception e) {
            LogUtil.error("Add report job error: " + taskId, e);
            throw new RuntimeException(e);
        }
    }

    /**
     * 立即执行任务
     *
     * @param taskId 任务ID
     */
    public void fireNow(Long taskId) {
        JobKey jobKey = JobKey.jobKey("report_" + taskId, FIRE_TRIGGER_GROUP);

        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("taskId", taskId);

        TriggerKey triggerKey = TriggerKey.triggerKey("report_" + taskId + "_fire", FIRE_TRIGGER_GROUP);

        try {
            scheduleManager.addOrUpdateSingleJob(jobKey, triggerKey,
                    io.dataease.report.job.ReportExecuteJob.class,
                    new Date(), jobDataMap);

            scheduleManager.fireNow(jobKey);
            LogUtil.info("Report job fired now: " + taskId);
        } catch (Exception e) {
            LogUtil.error("Fire report job now error: " + taskId, e);
            throw new RuntimeException(e);
        }
    }

    /**
     * 暂停任务
     *
     * @param taskId 任务ID
     */
    public void pauseJob(Long taskId) {
        TriggerKey triggerKey = TriggerKey.triggerKey("report_" + taskId, TRIGGER_GROUP);
        scheduleManager.pauseTrigger(triggerKey);

        // 更新任务状态
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task != null) {
            task.setStatus("STOPPED");
            task.setUpdateTime(System.currentTimeMillis());
            reportTaskMapper.updateById(task);
        }

        LogUtil.info("Report job paused: " + taskId);
    }

    /**
     * 恢复任务
     *
     * @param taskId 任务ID
     */
    public void resumeJob(Long taskId) {
        TriggerKey triggerKey = TriggerKey.triggerKey("report_" + taskId, TRIGGER_GROUP);
        scheduleManager.resumeTrigger(triggerKey);

        // 更新任务状态
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task != null) {
            task.setStatus("UNDERWAY");
            task.setUpdateTime(System.currentTimeMillis());
            reportTaskMapper.updateById(task);
        }

        LogUtil.info("Report job resumed: " + taskId);
    }

    /**
     * 删除任务
     *
     * @param taskId 任务ID
     */
    public void deleteJob(Long taskId) {
        JobKey jobKey = JobKey.jobKey("report_" + taskId, JOB_GROUP);
        TriggerKey triggerKey = TriggerKey.triggerKey("report_" + taskId, TRIGGER_GROUP);

        scheduleManager.removeJob(jobKey, triggerKey);
        LogUtil.info("Report job deleted: " + taskId);
    }

    /**
     * 构建Cron表达式
     *
     * @param task 任务
     * @return Cron表达式
     */
    private String buildCronExpression(ReportTask task) {
        // rateType: 0-小时, 1-日, 2-周, 3-月
        // rateVal格式:
        //   - 小时: "0" 表示每0小时（即每小时）
        //   - 日: "12:00" 表示每天12:00执行
        //   - 周: "1:12:00" 表示周一12:00执行 (1=周一, 7=周日)
        //   - 月: "1:12:00" 表示每月1号12:00执行
        Integer rateType = task.getRateType();
        String rateVal = task.getRateVal();

        if (StringUtils.isBlank(rateVal)) {
            return "0 0 * * * ?"; // 默认每小时
        }

        try {
            switch (rateType) {
                case 0: // 按小时
                    // rateVal = "0" 表示每小时
                    // rateVal = "2" 表示每2小时
                    int hourInterval = Integer.parseInt(rateVal.trim());
                    if (hourInterval <= 0) hourInterval = 1;
                    return "0 0 */" + hourInterval + " * * ?";

                case 1: // 按日
                    // rateVal = "12:00" 表示每天12:00
                    String[] dailyParts = rateVal.split(":");
                    String minute = dailyParts[0];
                    String hour = dailyParts.length > 1 ? dailyParts[1] : "0";
                    return "0 " + minute + " " + hour + " * * ?";

                case 2: // 按周
                    // rateVal = "1:12:00" 表示周一12:00
                    String[] weeklyParts = rateVal.split(":");
                    String dayOfWeek = weeklyParts[0];
                    String wMinute = weeklyParts.length > 1 ? weeklyParts[1] : "0";
                    String whour = weeklyParts.length > 2 ? weeklyParts[2] : "0";
                    return "0 " + wMinute + " " + whour + " ? * " + dayOfWeek;

                case 3: // 按月
                    // rateVal = "1:12:00" 表示每月1号12:00
                    String[] monthlyParts = rateVal.split(":");
                    String dayOfMonth = monthlyParts[0];
                    String mMinute = monthlyParts.length > 1 ? monthlyParts[1] : "0";
                    String mHour = monthlyParts.length > 2 ? monthlyParts[2] : "0";
                    return "0 " + mMinute + " " + mHour + " " + dayOfMonth + " * ?";

                default:
                    return "0 0 * * * ?";
            }
        } catch (Exception e) {
            LogUtil.error("Build cron expression error: " + rateType + ", " + rateVal, e);
            return "0 0 * * * ?";
        }
    }
}
