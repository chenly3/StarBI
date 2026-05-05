package io.dataease.report.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.dataease.api.report.dto.*;
import io.dataease.api.report.vo.ReportGridVO;
import io.dataease.api.report.vo.ReportInfoVO;
import io.dataease.api.report.vo.ReportInstanceVO;
import io.dataease.exception.DEException;
import io.dataease.report.dao.auto.entity.ReportRecipient;
import io.dataease.report.dao.auto.entity.ReportTask;
import io.dataease.report.dao.auto.entity.ReportTaskLog;
import io.dataease.report.dao.auto.mapper.ReportRecipientMapper;
import io.dataease.report.dao.auto.mapper.ReportTaskLogMapper;
import io.dataease.report.dao.auto.mapper.ReportTaskMapper;
import io.dataease.report.manage.ReportScheduleManage;
import io.dataease.report.service.ReportEmailService;
import io.dataease.report.service.ReportTaskService;
import io.dataease.utils.AuthUtils;
import io.dataease.utils.JsonUtil;
import io.dataease.utils.LogUtil;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.*;

/**
 * <p>
 * 定时报告服务实现
 * </p>
 *
 * @author fit2cloud
 * @since 2026-05-05
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class ReportTaskServiceImpl implements ReportTaskService {

    @Resource
    private ReportTaskMapper reportTaskMapper;

    @Resource
    private ReportTaskLogMapper reportTaskLogMapper;

    @Resource
    private ReportRecipientMapper reportRecipientMapper;

    @Resource
    private ReportScheduleManage reportScheduleManage;

    @Resource
    private ReportEmailService reportEmailService;

    @Override
    public IPage<ReportGridVO> pager(int goPage, int pageSize, ReportGridRequest request) {
        Page<ReportTask> page = new Page<>(goPage, pageSize);
        QueryWrapper<ReportTask> wrapper = new QueryWrapper<>();

        // 关键字搜索
        if (StringUtils.isNotBlank(request.getKeyword())) {
            wrapper.and(w -> w.like("name", request.getKeyword())
                    .or().like("title", request.getKeyword()));
        }

        // 状态过滤
        if (!CollectionUtils.isEmpty(request.getStatusList())) {
            wrapper.in("status", request.getStatusList().stream()
                    .map(s -> s == 0 ? "UNDERWAY" : "STOPPED")
                    .toArray(String[]::new));
        }

        // 时间倒序排列
        wrapper.orderByDesc("create_time");

        IPage<ReportTask> result = reportTaskMapper.selectPage(page, wrapper);

        // 转换为VO
        IPage<ReportGridVO> voPage = new Page<>(goPage, pageSize, result.getTotal());
        List<ReportGridVO> records = new ArrayList<>();
        for (ReportTask task : result.getRecords()) {
            ReportGridVO vo = convertToGridVO(task);
            records.add(vo);
        }
        voPage.setRecords(records);

        return voPage;
    }

    @Override
    public void create(ReportCreator creator) {
        // 参数验证
        if (StringUtils.isBlank(creator.getName())) {
            DEException.throwException("任务名称不能为空");
        }
        if (creator.getRtid() == null) {
            DEException.throwException("报告类型不能为空");
        }
        if (creator.getRid() == null) {
            DEException.throwException("资源ID不能为空");
        }
        if (creator.getRateType() == null) {
            DEException.throwException("调度类型不能为空");
        }
        if (StringUtils.isBlank(creator.getRateVal())) {
            DEException.throwException("调度值不能为空");
        }

        // 创建ReportTask
        ReportTask task = new ReportTask();
        task.setName(creator.getName());
        task.setTitle(creator.getTitle());
        task.setContent(creator.getContent());
        task.setRtid(creator.getRtid());
        task.setRid(creator.getRid());
        task.setShowWatermark(creator.getShowWatermark() != null ? creator.getShowWatermark() : false);
        task.setFormat(creator.getFormat());
        task.setViewIdList(creator.getViewIdList() != null ? JsonUtil.toJSONString(creator.getViewIdList()) : null);
        task.setViewDataRange(creator.getViewDataRange());
        task.setPixel(creator.getPixel());
        task.setExtWaitTime(creator.getExtWaitTime() != null ? creator.getExtWaitTime() : 0);
        task.setRateType(creator.getRateType());
        task.setRateVal(creator.getRateVal());
        task.setStartTime(creator.getStartTime());
        task.setEndTime(creator.getEndTime());
        task.setRetryEnable(creator.getRetryEnable());
        task.setRetryLimit(creator.getRetryLimit());
        task.setRetryInterval(creator.getRetryInterval());
        task.setReportFilter(creator.getReportFilter() != null ? JsonUtil.toJSONString(creator.getReportFilter()) : null);
        task.setDataPermission(creator.getDataPermission() != null ? creator.getDataPermission() : 0);
        task.setStatus("UNDERWAY");
        task.setCreateBy(AuthUtils.getUser().getUserId());
        task.setCreateTime(System.currentTimeMillis());
        task.setUpdateTime(System.currentTimeMillis());

        reportTaskMapper.insert(task);

        // 创建ReportRecipient记录
        if (!CollectionUtils.isEmpty(creator.getUidList()) && !CollectionUtils.isEmpty(creator.getReciFlagList())) {
            // 按用户添加
            if (creator.getReciFlagList().contains(1)) {
                for (Long uid : creator.getUidList()) {
                    createRecipient(task.getId(), 1, uid.toString());
                }
            }
            // 按角色添加
            if (creator.getReciFlagList().contains(0)) {
                for (Long rid : creator.getRidList()) {
                    createRecipient(task.getId(), 0, rid.toString());
                }
            }
            // 按邮箱添加
            if (creator.getReciFlagList().contains(3) && !CollectionUtils.isEmpty(creator.getEmailList())) {
                for (String email : creator.getEmailList()) {
                    createRecipient(task.getId(), 3, email);
                }
            }
            // 按钉钉群添加
            if (creator.getReciFlagList().contains(4) && !CollectionUtils.isEmpty(creator.getDingtalkGroupList())) {
                for (String group : creator.getDingtalkGroupList()) {
                    createRecipient(task.getId(), 4, group);
                }
            }
            // 按企业微信群添加
            if (creator.getReciFlagList().contains(5) && !CollectionUtils.isEmpty(creator.getWeComGroupList())) {
                for (String group : creator.getWeComGroupList()) {
                    createRecipient(task.getId(), 5, group);
                }
            }
            // 按飞书群添加
            if (creator.getReciFlagList().contains(6) && !CollectionUtils.isEmpty(creator.getLarkGroupList())) {
                for (String group : creator.getLarkGroupList()) {
                    createRecipient(task.getId(), 6, group);
                }
            }
        }

        // 添加调度任务
        reportScheduleManage.addJob(task);

        LogUtil.info("Report task created successfully: " + task.getId());
    }

    private void createRecipient(Long taskId, Integer reciFlag, String targetId) {
        ReportRecipient recipient = new ReportRecipient();
        recipient.setTaskId(taskId);
        recipient.setReciFlag(reciFlag);
        recipient.setTargetId(targetId);
        recipient.setCreateTime(System.currentTimeMillis());
        reportRecipientMapper.insert(recipient);
    }

    @Override
    public void update(ReportEditor editor) {
        // 参数验证
        if (editor.getTaskId() == null) {
            DEException.throwException("任务ID不能为空");
        }

        // 查询原任务
        ReportTask task = reportTaskMapper.selectById(editor.getTaskId());
        if (task == null) {
            DEException.throwException("任务不存在");
        }

        // 更新ReportTask
        task.setName(editor.getName());
        task.setTitle(editor.getTitle());
        task.setContent(editor.getContent());
        task.setRtid(editor.getRtid());
        task.setRid(editor.getRid());
        task.setShowWatermark(editor.getShowWatermark());
        task.setFormat(editor.getFormat());
        task.setViewIdList(editor.getViewIdList() != null ? JsonUtil.toJSONString(editor.getViewIdList()) : null);
        task.setViewDataRange(editor.getViewDataRange());
        task.setPixel(editor.getPixel());
        task.setExtWaitTime(editor.getExtWaitTime());
        task.setRateType(editor.getRateType());
        task.setRateVal(editor.getRateVal());
        task.setStartTime(editor.getStartTime());
        task.setEndTime(editor.getEndTime());
        task.setRetryEnable(editor.getRetryEnable());
        task.setRetryLimit(editor.getRetryLimit());
        task.setRetryInterval(editor.getRetryInterval());
        task.setReportFilter(editor.getReportFilter() != null ? JsonUtil.toJSONString(editor.getReportFilter()) : null);
        task.setDataPermission(editor.getDataPermission());
        task.setUpdateTime(System.currentTimeMillis());

        reportTaskMapper.updateById(task);

        // 删除旧的接收人记录
        QueryWrapper<ReportRecipient> wrapper = new QueryWrapper<>();
        wrapper.eq("task_id", editor.getTaskId());
        reportRecipientMapper.delete(wrapper);

        // 创建新的接收人记录
        if (!CollectionUtils.isEmpty(editor.getUidList()) && !CollectionUtils.isEmpty(editor.getReciFlagList())) {
            if (editor.getReciFlagList().contains(1)) {
                for (Long uid : editor.getUidList()) {
                    createRecipient(task.getId(), 1, uid.toString());
                }
            }
            if (editor.getReciFlagList().contains(0)) {
                for (Long rid : editor.getRidList()) {
                    createRecipient(task.getId(), 0, rid.toString());
                }
            }
            if (editor.getReciFlagList().contains(3) && !CollectionUtils.isEmpty(editor.getEmailList())) {
                for (String email : editor.getEmailList()) {
                    createRecipient(task.getId(), 3, email);
                }
            }
        }

        // 更新调度任务
        reportScheduleManage.addJob(task);

        LogUtil.info("Report task updated successfully: " + task.getId());
    }

    @Override
    public void fireNow(Long taskId) {
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task == null) {
            DEException.throwException("任务不存在");
        }
        reportScheduleManage.fireNow(taskId);
    }

    @Override
    public void stop(Long taskId) {
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task == null) {
            DEException.throwException("任务不存在");
        }
        if ("STOPPED".equals(task.getStatus())) {
            DEException.throwException("任务已停止");
        }
        reportScheduleManage.pauseJob(taskId);
    }

    @Override
    public void start(Long taskId) {
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task == null) {
            DEException.throwException("任务不存在");
        }
        if ("UNDERWAY".equals(task.getStatus())) {
            DEException.throwException("任务正在运行");
        }
        reportScheduleManage.resumeJob(taskId);
    }

    @Override
    public void delete(List<Long> taskIdList) {
        if (CollectionUtils.isEmpty(taskIdList)) {
            DEException.throwException("任务ID列表不能为空");
        }
        for (Long taskId : taskIdList) {
            // 删除调度任务
            reportScheduleManage.deleteJob(taskId);
            // 删除接收人记录
            QueryWrapper<ReportRecipient> wrapper = new QueryWrapper<>();
            wrapper.eq("task_id", taskId);
            reportRecipientMapper.delete(wrapper);
            // 删除任务记录
            reportTaskMapper.deleteById(taskId);
        }
        LogUtil.info("Report tasks deleted successfully: " + taskIdList);
    }

    @Override
    public ReportInfoVO info(Long taskId) {
        ReportTask task = reportTaskMapper.selectById(taskId);
        if (task == null) {
            DEException.throwException("任务不存在");
        }

        ReportInfoVO vo = new ReportInfoVO();
        vo.setTaskId(task.getId());
        vo.setName(task.getName());
        vo.setTitle(task.getTitle());
        vo.setContent(task.getContent());
        vo.setRtid(task.getRtid());
        vo.setRid(task.getRid());
        vo.setShowWatermark(task.getShowWatermark());
        vo.setFormat(task.getFormat());
        vo.setViewDataRange(task.getViewDataRange());
        vo.setPixel(task.getPixel());
        vo.setExtWaitTime(task.getExtWaitTime());
        vo.setRateType(task.getRateType());
        vo.setRateVal(task.getRateVal());
        vo.setStartTime(task.getStartTime());
        vo.setEndTime(task.getEndTime());
        vo.setRetryEnable(task.getRetryEnable());
        vo.setRetryLimit(task.getRetryLimit());
        vo.setRetryInterval(task.getRetryInterval());
        vo.setDataPermission(task.getDataPermission());

        // 解析viewIdList
        if (StringUtils.isNotBlank(task.getViewIdList())) {
            try {
                vo.setViewIdList(JsonUtil.parseList(task.getViewIdList(), String.class));
            } catch (Exception e) {
                LogUtil.error("Parse viewIdList error", e);
            }
        }

        // 查询接收人列表
        QueryWrapper<ReportRecipient> wrapper = new QueryWrapper<>();
        wrapper.eq("task_id", taskId);
        List<ReportRecipient> recipients = reportRecipientMapper.selectList(wrapper);

        List<String> emailList = new ArrayList<>();
        List<String> dingtalkGroupList = new ArrayList<>();
        List<String> larkGroupList = new ArrayList<>();
        List<String> uidList = new ArrayList<>();
        List<String> ridList = new ArrayList<>();

        for (ReportRecipient recipient : recipients) {
            switch (recipient.getReciFlag()) {
                case 0: // 角色
                    ridList.add(recipient.getTargetId());
                    break;
                case 1: // 用户
                    uidList.add(recipient.getTargetId());
                    break;
                case 3: // 邮箱
                    emailList.add(recipient.getTargetId());
                    break;
                case 4: // 钉钉群
                    dingtalkGroupList.add(recipient.getTargetId());
                    break;
                case 6: // 飞书群
                    larkGroupList.add(recipient.getTargetId());
                    break;
            }
        }

        vo.setEmailList(emailList);
        vo.setDingtalkGroupList(dingtalkGroupList);
        vo.setLarkGroupList(larkGroupList);

        return vo;
    }

    @Override
    public IPage<ReportInstanceVO> logPager(int goPage, int pageSize, ReportInstanceRequest request) {
        Page<ReportTaskLog> page = new Page<>(goPage, pageSize);
        QueryWrapper<ReportTaskLog> wrapper = new QueryWrapper<>();

        if (request.getTaskId() != null) {
            wrapper.eq("task_id", request.getTaskId());
        }

        if (!CollectionUtils.isEmpty(request.getExecStatusList())) {
            wrapper.in("status", request.getExecStatusList().stream()
                    .map(s -> s == 0 ? "SUCCESS" : "FAILED")
                    .toArray(String[]::new));
        }

        wrapper.orderByDesc("execute_time");

        IPage<ReportTaskLog> result = reportTaskLogMapper.selectPage(page, wrapper);

        // 转换为VO
        IPage<ReportInstanceVO> voPage = new Page<>(goPage, pageSize, result.getTotal());
        List<ReportInstanceVO> records = new ArrayList<>();
        for (ReportTaskLog log : result.getRecords()) {
            ReportInstanceVO vo = new ReportInstanceVO();
            vo.setId(log.getId());
            vo.setStartTime(log.getExecuteTime());
            vo.setExecStatus("SUCCESS".equals(log.getStatus()) ? 0 : 1);
            records.add(vo);
        }
        voPage.setRecords(records);

        return voPage;
    }

    @Override
    public void deleteLog(ReportInstanceDelRequest request) {
        QueryWrapper<ReportTaskLog> wrapper = new QueryWrapper<>();

        if (request.getTaskId() != null) {
            wrapper.eq("task_id", request.getTaskId());
        }

        if (!CollectionUtils.isEmpty(request.getIds())) {
            wrapper.in("id", request.getIds());
        }

        reportTaskLogMapper.delete(wrapper);
        LogUtil.info("Report logs deleted successfully");
    }

    @Override
    public String logMsg(ReportInstanceMsgRequest request) {
        ReportTaskLog log = reportTaskLogMapper.selectById(request.getId());
        if (log == null) {
            return "";
        }
        return log.getErrorInfo() != null ? log.getErrorInfo() : "";
    }

    @Override
    public ResponseEntity<ByteArrayResource> export(ReportExportRequest request) {
        // TODO: 实现导出报告配置
        // 1. 根据ID列表查询任务
        // 2. 生成Excel文件
        // 3. 返回文件下载
        LogUtil.info("Exporting report tasks");
        return null;
    }

    private ReportGridVO convertToGridVO(ReportTask task) {
        ReportGridVO vo = new ReportGridVO();
        vo.setId(task.getId());
        vo.setName(task.getName());
        vo.setStatus("UNDERWAY".equals(task.getStatus()) ? 0 : 1);
        vo.setCreateTime(task.getCreateTime());
        return vo;
    }
}
