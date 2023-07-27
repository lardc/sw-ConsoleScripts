include("PrintStatus.js")
include("Common.js")

function ECAC_Pulse(Voltage, Current , Line)
{
	//Задание действующего значения напряжения и тока
	w32(128, Voltage);
	w32(130, Current);

	// Заданние выходной цепи 1 - POW, 2 - CTRL
	dev.w(132, Line);
	
	//Формирование импульса
	dev.c(100);
}
//-----------------------------------------------------------

function ECAC_ConnectCTRL()
{
	dev.w(190, 0);
	dev.c(53);
	
	dev.w(190, 1);
	dev.c(52);
}
//-----------------------------------------------------------

function ECAC_ConnectPOW()
{
	dev.w(190, 0);
	dev.c(52);
	
	dev.w(190, 1);
	dev.c(53);
}
//-----------------------------------------------------------

function ECAC_Info()
{
p("DEV_STATE " + dev.r(192));		// Регистр состояния
p("FAULT_REASON " + dev.r(193));	// Регистр Fault
p("DISABLE_REASON " + dev.r(194));	// Регистр Disable
p("WARNING " + dev.r(195));			// Регистр Warning
p("PROBLEM " + dev.r(196));			// Регистр Problem
p("OP_RESULT " + dev.r(197));		// Регистр результата операции
p("SUB_STATE " + dev.r(198));		// Регистр вспомогательного состояния
}
//------------------------------------------------------------

function ECAC_Plot()
{
	plot2(dev.rafs(1), dev.rafs(2), 1, 0); sleep(500);
	plot2(dev.rafs(3), dev.rafs(4), 1, 0); sleep(500);
	plot2(dev.raf(5), dev.raf(6), 1, 0); sleep(500);
	plot2(dev.raf(7), dev.raf(8), 1, 0);
}
//------------------------------------------------------------

function ECAC_IsRMS()
{
	p("____RMS____");
	p("Voltage " + r32(200) + " mV");		// Регистр состояния
	p("Current " + r32(202) + " uA");
}
//------------------------------------------------------------

function ECAC_Stop()
{
	dev.c(101);
	sleep(300);
}
//------------------------------------------------------------