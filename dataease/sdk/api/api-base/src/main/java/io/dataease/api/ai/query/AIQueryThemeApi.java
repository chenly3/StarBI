package io.dataease.api.ai.query;

import com.github.xiaoymin.knife4j.annotations.ApiSupport;
import io.dataease.api.ai.query.request.AIQueryThemeSaveRequest;
import io.dataease.api.ai.query.vo.AIQueryThemeDatasetVO;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.SQLBotAdminEmbedVO;
import io.dataease.api.system.vo.SQLBotConfigVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "智能问数:分析主题")
@ApiSupport(order = 780)
@RequestMapping("/ai/query")
public interface AIQueryThemeApi {

    @Operation(summary = "查询分析主题列表")
    @GetMapping("/themes")
    List<AIQueryThemeVO> listThemes();

    @Operation(summary = "查询分析主题详情")
    @Parameter(name = "id", description = "主题ID", required = true, in = ParameterIn.PATH)
    @GetMapping("/themes/{id}")
    AIQueryThemeVO getTheme(@PathVariable("id") Long id);

    @Operation(summary = "新建分析主题")
    @PostMapping("/themes")
    AIQueryThemeVO createTheme(@RequestBody AIQueryThemeSaveRequest request);

    @Operation(summary = "更新分析主题")
    @PutMapping("/themes")
    AIQueryThemeVO updateTheme(@RequestBody AIQueryThemeSaveRequest request);

    @Operation(summary = "删除分析主题")
    @Parameter(name = "id", description = "主题ID", required = true, in = ParameterIn.PATH)
    @DeleteMapping("/themes/{id}")
    void deleteTheme(@PathVariable("id") Long id);

    @Operation(summary = "查询分析主题数据集")
    @Parameter(name = "id", description = "主题ID", required = true, in = ParameterIn.PATH)
    @GetMapping("/themes/{id}/datasets")
    List<AIQueryThemeDatasetVO> listThemeDatasets(@PathVariable("id") Long id);

    @Operation(summary = "查询问数嵌入配置")
    @GetMapping("/sqlbot/embed-config")
    SQLBotConfigVO sqlBotEmbedConfig();

    @Operation(summary = "查询问数OLD嵌入配置")
    @GetMapping("/sqlbotOld/embed-config")
    SQLBotConfigVO sqlBotOldEmbedConfig();

    @Operation(summary = "查询管理页嵌入配置")
    @Parameter(name = "pageKey", description = "页面标识", required = true, in = ParameterIn.PATH)
    @GetMapping("/sqlbot/admin-embed-config/{pageKey}")
    SQLBotAdminEmbedVO sqlBotAdminEmbedConfig(@PathVariable("pageKey") String pageKey);
}
